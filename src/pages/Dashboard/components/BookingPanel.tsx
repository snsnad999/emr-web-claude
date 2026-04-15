import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Autocomplete,
  Divider,
  CircularProgress,
  Chip,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  AccessTime as TimeIcon,
  Schedule as PastIcon,
  CurrencyRupee as RupeeIcon,
  DirectionsWalk as WalkInIcon,
  EventNote as ScheduleIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import debounce from 'lodash.debounce';
import { format, isValid } from 'date-fns';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { patientApi, appointmentApi, queueApi, invoiceApi, paymentApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { Patient, TimeSlot, ServiceDetail, SelectedService, PaymentSummary } from '@/types';
import ServiceSelection from './ServiceSelection';
import RegisterPatientDialog from '@/pages/Patients/components/RegisterPatientDialog';
import { useCurrentDate } from '@/hooks/useCurrentDate';

type BookingMode = 'checkin' | 'appointment';

interface BookingPanelProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  preselectedPatient?: Patient | null;
  preselectedSlot?: string;
}

export default function BookingPanel({
  open,
  onClose,
  selectedDate,
  preselectedPatient,
  preselectedSlot,
}: BookingPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(preselectedPatient ?? null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingDate, setBookingDate] = useState(selectedDate);
  const [slotDuration, setSlotDuration] = useState(30);
  const [notes, setNotes] = useState('');
  const [selectedServices, setSelectedServices] = useState<ServiceDetail[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingMode, setBookingMode] = useState<BookingMode>('checkin');
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  const todayStr = useCurrentDate();
  const isBookingToday = bookingDate === todayStr;
  const isBookingPast = bookingDate < todayStr;

  // Auto-switch mode when date changes
  useEffect(() => {
    setBookingMode(isBookingToday ? 'checkin' : 'appointment');
  }, [isBookingToday]);

  // Sync bookingDate when selectedDate prop changes
  useEffect(() => {
    setBookingDate(selectedDate);
    setSelectedSlot('');
  }, [selectedDate]);

  // Apply preselected slot when provided and panel opens
  useEffect(() => {
    if (open && preselectedSlot) {
      setSelectedSlot(preselectedSlot);
      // If a slot is preselected, switch to appointment mode
      setBookingMode('appointment');
    }
  }, [open, preselectedSlot]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetSearch = useCallback(
    debounce((val: string) => setDebouncedSearch(val), 300),
    [],
  );

  const handleSearchChange = (_: unknown, value: string) => {
    setSearchTerm(value);
    debouncedSetSearch(value);
  };

  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients-search', debouncedSearch],
    queryFn: () => patientApi.searchPatients(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  });

  const patients = patientsData?.data ?? [];

  // Sentinel for "Add Patient" row shown at the bottom of the dropdown.
  const ADD_PATIENT_SENTINEL: Patient = {
    patientId: '__ADD_NEW__',
    name: '',
    uhid: '',
    phone: '',
  } as Patient;

  // Show dropdown only when typing AND no patient selected yet
  const autocompleteOpen = searchTerm.trim().length >= 2 && !selectedPatient;

  // Only show "Add Patient" option when user is actively typing
  const patientOptions: Patient[] = searchTerm.trim().length >= 2
    ? [...patients, ADD_PATIENT_SENTINEL]
    : patients;

  // Only fetch slots in appointment mode
  const needsSlots = bookingMode === 'appointment';
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', bookingDate, user?.userId, user?.branchId, slotDuration],
    queryFn: () =>
      appointmentApi.getSlots({
        date: bookingDate,
        doctorId: user?.userId ?? '',
        branchId: user?.branchId ?? '',
        duration: slotDuration,
      }),
    enabled: open && !!bookingDate && needsSlots,
  });

  const slots: TimeSlot[] = slotsData?.data?.slots ?? [];

  // Past slot detection (client-side safety)
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const isSlotPast = (time: string): boolean => {
    if (!isBookingToday) return false;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m <= nowMinutes;
  };

  // Transform ServiceDetail[] to SelectedService[] for the API
  const getServicesPayload = (): SelectedService[] =>
    selectedServices.map(({ service, price }) => ({
      serviceId: service.serviceId,
      name: service.name,
      price: price || 0,
    }));

  const totalServiceAmount = useMemo(
    () => selectedServices.reduce((sum, d) => sum + (Number(d.price) || 0), 0),
    [selectedServices],
  );

  const resetForm = () => {
    setSelectedPatient(null);
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedSlot('');
    setSlotDuration(30);
    setNotes('');
    setSelectedServices([]);
    setPaymentSummary(null);
  };

  const handleServicesChange = (services: ServiceDetail[], paymentData?: PaymentSummary) => {
    setSelectedServices(services);
    setPaymentSummary(paymentData ?? null);
  };

  const handlePaymentUpdate = (data: PaymentSummary) => {
    setPaymentSummary(data);
  };

  // Record payments against an invoice (shared by both modes)
  const recordPayments = async (invoiceId: string) => {
    if (!paymentSummary || paymentSummary.entries.length === 0) return;
    for (const entry of paymentSummary.entries) {
      if (entry.amount > 0) {
        await paymentApi.createPayment({
          invoiceId,
          amount: entry.amount,
          method: entry.method,
          collectedBy: user?.name ?? user?.userId ?? 'dev-user',
        });
      }
    }
  };

  // Walk-in check-in: directly adds patient to today's queue
  const handleCheckin = async () => {
    if (isBookingPast) {
      toast.error('Cannot check in on a past date — dates before today are read-only');
      return;
    }
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Add to queue directly
      const now = new Date();
      const checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      await queueApi.addToQueue({
        organizationId: user?.organizationId ?? '',
        branchId: user?.branchId ?? '',
        patientId: selectedPatient.patientId,
        patientName: selectedPatient.name,
        uhid: selectedPatient.uhid,
        queueDate: bookingDate,
        slot: checkInTime,
        status: 'Waiting',
        appointmentType: 'walk_in',
        checkInTime,
        durationMinutes: slotDuration,
        notes,
        services: getServicesPayload(),
        serviceAmount: totalServiceAmount,
      });

      // Step 2: If payment was collected, record it (invoice already auto-created by backend)
      if (selectedServices.length > 0 && paymentSummary && paymentSummary.entries.length > 0) {
        try {
          // Backend auto-creates invoice in addToQueue, but we need the invoiceId
          // Create a separate invoice to record payments against
          const lineItems = selectedServices.map((sd) => ({
            description: sd.service.name,
            quantity: 1,
            unitPrice: sd.price,
            discount: 0,
            total: sd.price,
          }));
          const invoiceResult = await invoiceApi.createInvoice({
            organizationId: user?.organizationId ?? '',
            patientId: selectedPatient.patientId,
            lineItems,
          });
          const invoiceId = invoiceResult.data?.invoiceId;
          if (invoiceId) {
            await recordPayments(invoiceId);
          }
          toast.success(
            `Patient checked in — Payment of ₹${paymentSummary.totalPaid.toLocaleString('en-IN')} recorded`,
          );
        } catch {
          toast.warning('Patient checked in, but payment recording failed. Collect payment manually.');
        }
      } else {
        const serviceCount = selectedServices.length;
        const msg =
          serviceCount > 0
            ? `Patient checked in with ${serviceCount} service${serviceCount > 1 ? 's' : ''} (₹${totalServiceAmount.toLocaleString('en-IN')})`
            : 'Patient checked in successfully';
        toast.success(msg);
      }

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['queue-range'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      resetForm();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined;
      toast.error(msg || 'Failed to check in patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scheduled appointment: creates appointment + queue entry
  const handleBookAppointment = async () => {
    if (isBookingPast) {
      toast.error('Cannot book on a past date — dates before today are read-only');
      return;
    }
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    if (!selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await appointmentApi.createAppointment({
        organizationId: user?.organizationId ?? '',
        branchId: user?.branchId ?? '',
        patientId: selectedPatient.patientId,
        patientName: selectedPatient.name,
        doctorId: user?.userId ?? '',
        slot: selectedSlot,
        slotDate: bookingDate,
        notes,
        status: 'Booked',
        serviceIds: selectedServices.map((s) => s.service.serviceId),
        services: getServicesPayload(),
      });

      const appointmentId = result.data?.appointment?.appointmentId;

      // If services + payment collected, create invoice + record payments
      if (selectedServices.length > 0 && paymentSummary && paymentSummary.entries.length > 0) {
        try {
          const lineItems = selectedServices.map((sd) => ({
            description: sd.service.name,
            quantity: 1,
            unitPrice: sd.price,
            discount: 0,
            total: sd.price,
          }));

          const invoiceResult = await invoiceApi.createInvoice({
            organizationId: user?.organizationId ?? '',
            patientId: selectedPatient.patientId,
            appointmentId: appointmentId ?? undefined,
            lineItems,
          });

          const invoiceId = invoiceResult.data?.invoiceId;
          if (invoiceId) {
            await recordPayments(invoiceId);
          }

          toast.success(
            `Appointment booked — Payment of ₹${paymentSummary.totalPaid.toLocaleString('en-IN')} recorded`,
          );
        } catch {
          toast.warning('Appointment booked, but payment recording failed. Collect payment manually.');
        }
      } else {
        const serviceCount = selectedServices.length;
        const msg =
          serviceCount > 0
            ? `Appointment booked with ${serviceCount} service${serviceCount > 1 ? 's' : ''} (₹${totalServiceAmount.toLocaleString('en-IN')})`
            : 'Appointment booked successfully';
        toast.success(msg);
      }

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['queue-range'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      resetForm();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined;
      toast.error(msg || 'Failed to book appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (bookingMode === 'checkin') {
      handleCheckin();
    } else {
      handleBookAppointment();
    }
  };

  const formatSlotLabel = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  };

  const isCheckinMode = bookingMode === 'checkin';

  // Live clock for check-in mode (updates every 30s).
  const [nowTick, setNowTick] = useState(() => new Date());
  useEffect(() => {
    if (!open || !isCheckinMode) return;
    const t = setInterval(() => setNowTick(new Date()), 30_000);
    return () => clearInterval(t);
  }, [open, isCheckinMode]);
  const currentTimeLabel = format(nowTick, 'hh:mm a');
  const canSubmit = isBookingPast
    ? false
    : isCheckinMode
      ? !isSubmitting && !!selectedPatient
      : !isSubmitting && !!selectedPatient && !!selectedSlot;

  const getSubmitLabel = () => {
    if (isBookingPast) return 'Past date — read only';
    if (isSubmitting) return isCheckinMode ? 'Checking in...' : 'Booking...';
    if (paymentSummary && paymentSummary.totalPaid > 0) {
      return isCheckinMode
        ? `Check-in & Pay ₹${paymentSummary.totalPaid.toLocaleString('en-IN')}`
        : `Book & Pay ₹${paymentSummary.totalPaid.toLocaleString('en-IN')}`;
    }
    if (totalServiceAmount > 0) {
      return isCheckinMode
        ? `Check-in (₹${totalServiceAmount.toLocaleString('en-IN')})`
        : `Book Appointment (₹${totalServiceAmount.toLocaleString('en-IN')})`;
    }
    return isCheckinMode ? 'Check-in Patient' : 'Book Appointment';
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 440 }, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Fixed header */}
      <Box sx={{ flexShrink: 0, px: 3, pt: 3, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            {isCheckinMode ? 'Walk-in Check-in' : 'Book Appointment'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
      </Box>

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2.5 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {isBookingPast && (
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderColor: 'error.light',
              bgcolor: (t) => alpha(t.palette.error.main, 0.06),
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <PastIcon fontSize="small" color="error" />
            <Typography variant="body2" color="error.dark" fontWeight={600}>
              This date is in the past — booking and check-in are disabled. You can only view the queue.
            </Typography>
          </Paper>
        )}

        {/* Booking mode toggle (only show when booking for today) */}
        {isBookingToday && (
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Booking Type
            </Typography>
            <ToggleButtonGroup
              value={bookingMode}
              exclusive
              onChange={(_, val) => {
                if (val !== null) {
                  setBookingMode(val as BookingMode);
                  setSelectedSlot('');
                }
              }}
              size="small"
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  gap: 0.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&.Mui-selected': {
                    bgcolor: isCheckinMode ? 'success.main' : 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: isCheckinMode ? 'success.dark' : 'primary.dark',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="checkin">
                <WalkInIcon fontSize="small" />
                Walk-in
              </ToggleButton>
              <ToggleButton value="appointment">
                <ScheduleIcon fontSize="small" />
                Appointment
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {/* Patient search */}
        <Autocomplete
          options={patientOptions}
          open={autocompleteOpen}
          getOptionLabel={(option) =>
            option.patientId === '__ADD_NEW__' ? '' : `${option.name} - ${option.uhid}`
          }
          inputValue={searchTerm}
          onInputChange={handleSearchChange}
          value={selectedPatient}
          onChange={(_, val) => {
            if (val && val.patientId === '__ADD_NEW__') {
              setRegisterDialogOpen(true);
              return;
            }
            setSelectedPatient(val);
            if (val) {
              setSearchTerm('');
              setDebouncedSearch('');
              toast.success(`Selected: ${val.name} (${val.uhid})`);
            }
          }}
          loading={patientsLoading}
          filterOptions={(x) => x}
          isOptionEqualToValue={(opt, val) => opt.patientId === val.patientId}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Patient"
              placeholder="Name, UHID, or Phone"
              slotProps={{
                input: {
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {patientsLoading && <CircularProgress color="inherit" size={20} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                },
              }}
            />
          )}
          renderOption={(props, option) => {
            const { key, ...rest } = props;
            if (option.patientId === '__ADD_NEW__') {
              return (
                <Box
                  component="li"
                  key={key}
                  {...rest}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: 'primary.main',
                    fontWeight: 600,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <PersonAddIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={600}>
                    {searchTerm.trim()
                      ? `Add "${searchTerm.trim()}" as new patient`
                      : 'Add new patient'}
                  </Typography>
                </Box>
              );
            }
            return (
              <Box
                component="li"
                key={key}
                {...rest}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important' }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {option.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.uhid} | {option.phone}
                </Typography>
              </Box>
            );
          }}
        />

        {/* Date picker */}
        <Box>
          <DatePicker
            label={isCheckinMode ? 'Check-in Date' : 'Appointment Date'}
            value={bookingDate ? new Date(bookingDate + 'T00:00:00') : null}
            format="dd/MM/yyyy"
            onChange={(newVal) => {
              if (!newVal || !isValid(newVal)) {
                setBookingDate('');
                setSelectedSlot('');
                return;
              }
              setBookingDate(format(newVal, 'yyyy-MM-dd'));
              setSelectedSlot('');
            }}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
          {isCheckinMode && (
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontWeight: 600 }}
            >
              Current time: {currentTimeLabel}
            </Typography>
          )}
        </Box>

        {/* Slot duration + Time slots — only for appointment mode */}
        {!isCheckinMode && (
          <>
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Slot Duration
              </Typography>
              <ToggleButtonGroup
                value={slotDuration}
                exclusive
                onChange={(_, val) => {
                  if (val !== null) {
                    setSlotDuration(val as number);
                  }
                }}
                size="small"
                fullWidth
              >
                <ToggleButton value={15}>15 min</ToggleButton>
                <ToggleButton value={30}>30 min</ToggleButton>
                <ToggleButton value={45}>45 min</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <TimeIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" fontWeight={600}>
                  Available Time Slots
                </Typography>
              </Box>

              {slotsLoading ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" width={80} height={32} />
                  ))}
                </Box>
              ) : slots.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No slots configured for this date.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {slots.map((slot) => {
                    const past = isSlotPast(slot.time);
                    const slotDisabled = !slot.available || past;

                    return (
                      <Chip
                        key={slot.time}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {past && <PastIcon sx={{ fontSize: 12 }} />}
                            {formatSlotLabel(slot.time)}
                          </Box>
                        }
                        clickable={!slotDisabled}
                        disabled={slotDisabled}
                        color={selectedSlot === slot.time ? 'primary' : 'default'}
                        variant={selectedSlot === slot.time ? 'filled' : 'outlined'}
                        onClick={() => {
                          if (!slotDisabled) setSelectedSlot(slot.time);
                        }}
                        sx={{
                          minWidth: 80,
                          ...(!slotDisabled &&
                            selectedSlot !== slot.time && {
                              borderColor: 'success.main',
                              color: 'success.dark',
                              '&:hover': { bgcolor: 'success.light', borderColor: 'success.dark' },
                            }),
                          ...(slotDisabled && {
                            bgcolor: 'action.disabledBackground',
                            textDecoration: 'line-through',
                            opacity: past ? 0.5 : undefined,
                          }),
                        }}
                      />
                    );
                  })}
                </Box>
              )}
              {selectedSlot && (
                <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                  Selected: {formatSlotLabel(selectedSlot)}
                </Typography>
              )}
            </Box>
          </>
        )}

        {/* Service Selection */}
        <ServiceSelection
          selectedServices={selectedServices}
          onChange={handleServicesChange}
          showPayment
          paymentSummary={paymentSummary}
          onPaymentUpdate={handlePaymentUpdate}
        />

        {/* Notes */}
        <TextField
          label="Notes"
          multiline
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
        />

        {/* Booking Summary */}
        {(selectedPatient || selectedSlot || selectedServices.length > 0) && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: (t) => alpha(isCheckinMode ? t.palette.success.main : t.palette.primary.main, 0.03),
              borderColor: isCheckinMode ? 'success.light' : 'primary.light',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {isCheckinMode ? 'Check-in Summary' : 'Booking Summary'}
              </Typography>
              <Chip
                label={isCheckinMode ? 'Walk-in' : 'Scheduled'}
                size="small"
                color={isCheckinMode ? 'success' : 'primary'}
                sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem' }}
              />
            </Box>
            {selectedPatient && (
              <Typography variant="body2" color="text.secondary">
                Patient: <strong>{selectedPatient.name}</strong> ({selectedPatient.uhid})
              </Typography>
            )}
            {!isCheckinMode && selectedSlot && (
              <Typography variant="body2" color="text.secondary">
                Slot: <strong>{formatSlotLabel(selectedSlot)}</strong> on {bookingDate}
              </Typography>
            )}
            {isCheckinMode && (
              <Typography variant="body2" color="text.secondary">
                Added to today&apos;s queue immediately
              </Typography>
            )}
            {selectedServices.length > 0 && (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Services: {selectedServices.length} selected
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <RupeeIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="body2" fontWeight={700} color="success.dark">
                    Total: ₹{totalServiceAmount.toLocaleString('en-IN')}
                  </Typography>
                </Box>
              </Box>
            )}
            {paymentSummary && paymentSummary.entries.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={`Paid: ₹${paymentSummary.totalPaid.toLocaleString('en-IN')}`}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                  {paymentSummary.balance > 0 && (
                    <Chip
                      label={`Balance: ₹${paymentSummary.balance.toLocaleString('en-IN')}`}
                      size="small"
                      color="error"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {paymentSummary.entries.map((e, i) => (
                    <Chip
                      key={i}
                      label={`${e.method}: ₹${e.amount.toLocaleString('en-IN')}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 22 }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        )}

      </Box>
      </Box>

      {/* Fixed bottom button */}
      <Box sx={{ flexShrink: 0, px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          color={isCheckinMode ? 'success' : 'primary'}
          onClick={handleSubmit}
          disabled={!canSubmit}
          startIcon={isCheckinMode ? <WalkInIcon /> : <ScheduleIcon />}
        >
          {getSubmitLabel()}
        </Button>
      </Box>

      {/* Register dialog — opened from the "Add patient" row in the search dropdown */}
      <RegisterPatientDialog
        open={registerDialogOpen}
        onClose={() => {
          setRegisterDialogOpen(false);
          // Re-run the search so the new patient appears
          if (debouncedSearch.length >= 2) {
            queryClient.invalidateQueries({ queryKey: ['patients-search'] });
          }
        }}
        initialName={searchTerm.trim() && !/^\d+$/.test(searchTerm.trim()) ? searchTerm.trim() : undefined}
        initialPhone={/^\d{10}$/.test(searchTerm.trim()) ? searchTerm.trim() : undefined}
      />
    </Drawer>
    </LocalizationProvider>
  );
}
