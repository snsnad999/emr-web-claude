import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Paper,
  Popper,
  ClickAwayListener,
  CircularProgress,
  Chip,
  Checkbox,
  Collapse,
  Divider,
  Stack,
  FormControlLabel,
  InputAdornment,
  RadioGroup,
  Radio,
  FormLabel,
} from '@mui/material';
import {
  Person as PersonIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  MedicalServices as MedicalServicesIcon,
  PlaylistAdd as PlaylistAddIcon,
  EventAvailable as EventAvailableIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  ReceiptLong as ReceiptLongIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
} from '@mui/icons-material';
import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import debounce from 'lodash.debounce';
import { format, differenceInYears, differenceInMonths, differenceInDays, subYears, subMonths, subDays, isValid } from 'date-fns';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { patientApi, placesApi } from '@/services/api';
import type { PlacePrediction } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { Patient } from '@/types';

const toTitleCase = (val: string): string =>
  val.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());

const todayStr = new Date().toISOString().split('T')[0];

const phoneRegex = /^[0-9]{10}$/;

const schema = z.object({
  salutation: z.string().min(1, 'Required'),
  name: z
    .string()
    .min(2, 'Name is required')
    .regex(/^[A-Za-z\s.'-]+$/, 'Name can only contain letters'),
  gender: z.enum(['M', 'F', 'Other'] as const, { message: 'Gender is required' }),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((val) => val <= todayStr, { message: 'Date of birth cannot be in the future' }),
  phone: z.string().regex(phoneRegex, 'Phone must be 10 digits'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  ageValue: z.string().optional(),
  ageUnit: z.enum(['Years', 'Months', 'Days']).optional(),
});

type FormData = z.infer<typeof schema>;
type AgeUnit = 'Years' | 'Months' | 'Days';

interface RegisterPatientDialogProps {
  open: boolean;
  onClose: () => void;
  initialName?: string;
  initialPhone?: string;
}

// ─── Medical History Types & Defaults ──────────────────────────────
interface MedicalCondition {
  name: string;
  value: 'Y' | 'N' | '-';
  since?: string;
}

const DEFAULT_CONDITIONS: MedicalCondition[] = [
  { name: 'Diabetes mellitus', value: '-' }, { name: 'Hypertension', value: '-' },
  { name: 'Hypothyroidism', value: '-' }, { name: 'Alcohol', value: '-' },
  { name: 'Tobacco', value: '-' }, { name: 'Tobacco (Chewing)', value: '-' },
  { name: 'Smoking', value: '-' }, { name: 'Dustel 0.5Mg Tablet', value: '-' },
];

// ─── Condition Card Sub-component ──────────────────────────────────
// Thumbs-up = Yes (green, shows "since" input). Thumbs-down = No (red).
// Clicking the active button again clears the selection back to neutral.
function ConditionCard({ condition, index, onValueChange, onSinceChange }: {
  condition: MedicalCondition; index: number;
  onValueChange: (i: number, v: 'Y' | 'N' | '-') => void;
  onSinceChange: (i: number, s: string) => void;
}) {
  const isYes = condition.value === 'Y';
  const isNo = condition.value === 'N';

  const borderColor = isYes ? '#86efac' : isNo ? '#fca5a5' : 'divider';
  const bgColor = isYes ? '#f0fdf4' : isNo ? '#fef2f2' : 'background.paper';

  const handleYes = () => onValueChange(index, isYes ? '-' : 'Y');
  const handleNo = () => onValueChange(index, isNo ? '-' : 'N');

  return (
    <Box
      sx={{
        p: 1.5,
        border: '1px solid',
        borderColor,
        borderRadius: 2,
        bgcolor: bgColor,
        transition: 'all 0.2s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ color: '#1f2937', fontSize: 13, flex: 1, minWidth: 0 }}
          noWrap
          title={condition.name}
        >
          {condition.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
          <Button
            onClick={handleYes}
            disableElevation
            variant={isYes ? 'contained' : 'outlined'}
            endIcon={<ThumbUpIcon sx={{ fontSize: 18 }} />}
            aria-label={isYes ? 'Clear yes' : 'Mark yes'}
            sx={{
              minWidth: 92,
              height: 38,
              px: 1.5,
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13,
              bgcolor: isYes ? '#10b981' : 'background.paper',
              borderColor: isYes ? '#10b981' : '#e5e7eb',
              color: isYes ? '#fff' : '#6b7280',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: isYes ? '#059669' : '#ecfdf5',
                borderColor: '#10b981',
                color: isYes ? '#fff' : '#10b981',
                transform: 'translateY(-1px)',
              },
            }}
          >
            Yes
          </Button>
          <Button
            onClick={handleNo}
            disableElevation
            variant={isNo ? 'contained' : 'outlined'}
            endIcon={<ThumbDownIcon sx={{ fontSize: 18 }} />}
            aria-label={isNo ? 'Clear no' : 'Mark no'}
            sx={{
              minWidth: 92,
              height: 38,
              px: 1.5,
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13,
              bgcolor: isNo ? '#ef4444' : 'background.paper',
              borderColor: isNo ? '#ef4444' : '#e5e7eb',
              color: isNo ? '#fff' : '#6b7280',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: isNo ? '#dc2626' : '#fef2f2',
                borderColor: '#ef4444',
                color: isNo ? '#fff' : '#ef4444',
                transform: 'translateY(-1px)',
              },
            }}
          >
            No
          </Button>
        </Box>
      </Box>
      <Collapse in={isYes} timeout={200} unmountOnExit>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap', fontWeight: 500 }}
          >
            Since
          </Typography>
          <TextField
            value={condition.since || ''}
            onChange={(e) => onSinceChange(index, e.target.value)}
            size="small"
            placeholder="e.g. 2020"
            sx={{
              '& .MuiInputBase-root': { height: 28, fontSize: 12, bgcolor: '#fff' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#bbf7d0' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#86efac' },
            }}
            fullWidth
          />
        </Box>
      </Collapse>
    </Box>
  );
}


/** Compute age string from DOB for display in suggestions */
function computeAge(dob: string): string {
  if (!dob) return '';
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    years--;
  }
  return years > 0 ? `${years}y` : '';
}

export default function RegisterPatientDialog({ open, onClose, initialName, initialPhone }: RegisterPatientDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, touchedFields },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      salutation: 'Mr',
      name: initialName ? toTitleCase(initialName) : '',
      gender: 'M',
      dateOfBirth: '',
      phone: initialPhone ?? '',
      email: '',
      address: '',
      bloodGroup: '',
      ageValue: '',
      ageUnit: 'Years',
    },
  });

  // Guard against DOB <-> Age watch loop
  const isSyncingRef = useRef(false);
  const dobValue = watch('dateOfBirth');
  const ageValue = watch('ageValue');
  const ageUnitValue = watch('ageUnit');
  const phoneValue = watch('phone');

  // --- Medical History State ---
  const [medicalConditions, setMedicalConditions] = useState<MedicalCondition[]>(
    DEFAULT_CONDITIONS.map((c) => ({ ...c }))
  );
  const [noRelevantHistory, setNoRelevantHistory] = useState(false);

  // --- Name-based patient suggestions ---
  const nameFieldRef = useRef<HTMLDivElement>(null);
  const [nameSuggestionsOpen, setNameSuggestionsOpen] = useState(false);
  const [debouncedNameSearch, setDebouncedNameSearch] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetNameSearch = useCallback(
    debounce((val: string) => setDebouncedNameSearch(val), 300),
    [],
  );

  const { data: nameSuggestionsData, isLoading: nameSuggestionsLoading } = useQuery({
    queryKey: ['register-name-search', debouncedNameSearch],
    queryFn: () => patientApi.searchPatients(debouncedNameSearch),
    enabled: debouncedNameSearch.length >= 2,
  });

  const nameSuggestions: Patient[] = nameSuggestionsData?.data ?? [];

  // --- Google Places Address Autocomplete (via backend proxy) ---
  const addressFieldRef = useRef<HTMLDivElement>(null);
  const [addressSuggestionsOpen, setAddressSuggestionsOpen] = useState(false);
  const [addressPredictions, setAddressPredictions] = useState<PlacePrediction[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressReqIdRef = useRef(0);

  const fetchAddressPredictions = useCallback(
    debounce(async (input: string) => {
      const trimmed = input.trim();
      if (trimmed.length < 3) {
        setAddressPredictions([]);
        setAddressLoading(false);
        return;
      }
      const reqId = ++addressReqIdRef.current;
      setAddressLoading(true);
      try {
        const res = await placesApi.autocomplete(trimmed);
        // Ignore out-of-order responses
        if (reqId !== addressReqIdRef.current) return;
        setAddressPredictions(res.data?.predictions ?? []);
      } catch {
        if (reqId !== addressReqIdRef.current) return;
        setAddressPredictions([]);
      } finally {
        if (reqId === addressReqIdRef.current) setAddressLoading(false);
      }
    }, 300),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Repopulate when dialog re-opens
  useEffect(() => {
    if (open) {
      reset({
        salutation: 'Mr',
        name: initialName ? toTitleCase(initialName) : '',
        gender: 'M',
        dateOfBirth: '',
        phone: initialPhone ?? '',
        email: '',
        address: '',
        bloodGroup: '',
        ageValue: '',
        ageUnit: 'Years',
      });
      setMedicalConditions(DEFAULT_CONDITIONS.map((c) => ({ ...c })));
      setNoRelevantHistory(false);
      setDebouncedNameSearch(initialName && initialName.length >= 2 ? initialName : '');
      setNameSuggestionsOpen(false);
    }
  }, [open, initialName, initialPhone, reset]);

  // Sync DOB -> Age
  useEffect(() => {
    if (isSyncingRef.current) return;
    if (!dobValue) return;
    const d = new Date(dobValue);
    if (!isValid(d)) return;
    const now = new Date();
    const years = differenceInYears(now, d);
    const months = differenceInMonths(now, d);
    const days = differenceInDays(now, d);
    let unit: AgeUnit = 'Years';
    let val = years;
    if (years >= 2) { unit = 'Years'; val = years; }
    else if (months >= 2) { unit = 'Months'; val = months; }
    else { unit = 'Days'; val = days; }
    const valStr = String(val);
    if (ageValue !== valStr || ageUnitValue !== unit) {
      isSyncingRef.current = true;
      setValue('ageValue', valStr, { shouldValidate: false });
      setValue('ageUnit', unit, { shouldValidate: false });
      setTimeout(() => { isSyncingRef.current = false; }, 0);
    }
  }, [dobValue, ageValue, ageUnitValue, setValue]);

  // Sync Age -> DOB. Empty age clears DOB (so user can clear Age field).
  const applyAgeToDob = (val: string, unit: AgeUnit) => {
    isSyncingRef.current = true;
    if (!val) {
      if (dobValue) setValue('dateOfBirth', '', { shouldValidate: false });
      setTimeout(() => { isSyncingRef.current = false; }, 0);
      return;
    }
    const n = parseInt(val, 10);
    if (Number.isNaN(n) || n < 0) {
      setTimeout(() => { isSyncingRef.current = false; }, 0);
      return;
    }
    const now = new Date();
    let computed: Date;
    if (unit === 'Years') computed = subYears(now, n);
    else if (unit === 'Months') computed = subMonths(now, n);
    else computed = subDays(now, n);
    const computedStr = format(computed, 'yyyy-MM-dd');
    if (dobValue !== computedStr) {
      setValue('dateOfBirth', computedStr, { shouldValidate: false });
    }
    setTimeout(() => { isSyncingRef.current = false; }, 0);
  };

  // Medical history handlers
  const handleValueChange = (index: number, newValue: 'Y' | 'N' | '-') => {
    setMedicalConditions((prev) =>
      prev.map((c, i) => i === index ? { ...c, value: newValue, since: newValue === 'Y' ? c.since : '' } : c)
    );
  };

  const handleSinceChange = (index: number, since: string) => {
    setMedicalConditions((prev) =>
      prev.map((c, i) => i === index ? { ...c, since } : c)
    );
  };

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const addressStr = data.address ?? '';
      // Build medical history payload
      const medicalHistory = noRelevantHistory ? { noRelevantHistory: true, conditions: [] } : {
        noRelevantHistory: false,
        conditions: medicalConditions.filter((c) => c.value !== '-'),
      };
      return patientApi.createPatient({
        organizationId: user?.organizationId ?? '',
        branchId: user?.branchId ?? '',
        salutation: data.salutation as 'Mr' | 'Mrs' | 'Ms' | 'Dr' | 'Master' | 'Baby',
        name: data.name,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        phone: data.phone,
        email: data.email || undefined,
        address: {
          street: addressStr,
          city: '',
          state: '',
          pincode: '',
        },
        bloodGroup: (data.bloodGroup as 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-') || undefined,
        createdBy: user?.userId ?? '',
        medicalHistory,
      });
    },
    onSuccess: (res, variables) => {
      toast.success('Patient registered successfully');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients-search'] });
      queryClient.invalidateQueries({ queryKey: ['header-patient-search'] });
      // Backend returns only { patientId, uhid }. Merge with form data so
      // downstream consumers (BookingPanel, etc.) have name/phone/gender/dob.
      const ret = (res?.data as Partial<Patient>) ?? {};
      const merged: Patient = {
        patientId: ret.patientId ?? '',
        uhid: ret.uhid ?? '',
        organizationId: user?.organizationId ?? '',
        branchId: user?.branchId ?? '',
        salutation: variables.salutation as Patient['salutation'],
        name: variables.name,
        gender: variables.gender,
        dateOfBirth: variables.dateOfBirth,
        phone: variables.phone,
        email: variables.email || undefined,
        bloodGroup: (variables.bloodGroup as Patient['bloodGroup']) || undefined,
        address: { street: variables.address ?? '', city: '', state: '', pincode: '' },
        isActive: true,
      } as Patient;
      if (merged.patientId) {
        setCreatedPatient(merged);
      } else {
        reset();
        onClose();
      }
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          : undefined;
      toast.error(msg || 'Failed to register patient');
    },
  });

  const onSubmit = (data: FormData) => {
    if (data.dateOfBirth > todayStr) {
      toast.error('Date of birth cannot be in the future');
      return;
    }
    // Phone validation via toast
    if (data.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    mutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    setCreatedPatient(null);
    setNameSuggestionsOpen(false);
    onClose();
  };

  // ─── Post-creation action handlers ────────────────────────────────
  const closeAfterAction = () => {
    reset();
    setCreatedPatient(null);
    setNameSuggestionsOpen(false);
    onClose();
  };

  const handleStartVisit = () => {
    if (!createdPatient) return;
    closeAfterAction();
    navigate(`/visit-details/${createdPatient.patientId}`);
  };

  const handleAddToQueue = () => {
    if (!createdPatient) return;
    closeAfterAction();
    navigate('/', { state: { openBooking: 'queue', patient: createdPatient } });
  };

  const handleBookAppointment = () => {
    if (!createdPatient) return;
    closeAfterAction();
    navigate('/', { state: { openBooking: 'appointment', patient: createdPatient } });
  };

  const handleViewAllPatients = () => {
    closeAfterAction();
    navigate('/patients');
  };

  const handleAddAnother = () => {
    reset();
    setMedicalConditions(DEFAULT_CONDITIONS.map((c) => ({ ...c })));
    setNoRelevantHistory(false);
    setCreatedPatient(null);
    setNameSuggestionsOpen(false);
  };

  const handleBillPatient = () => {
    if (!createdPatient) return;
    closeAfterAction();
    navigate('/payments', { state: { patient: createdPatient } });
  };

  const phoneTouched = !!touchedFields.phone;
  const phoneLen = (phoneValue ?? '').length;
  const phoneCounterColor =
    phoneLen === 10 ? 'success.main' : phoneTouched ? 'error.main' : 'text.secondary';

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth PaperProps={{ sx: { maxWidth: 1320 } }}>
      {createdPatient ? (
        <PostRegisterActions
          patient={createdPatient}
          onStartVisit={handleStartVisit}
          onAddToQueue={handleAddToQueue}
          onBookAppointment={handleBookAppointment}
          onViewAllPatients={handleViewAllPatients}
          onAddAnother={handleAddAnother}
          onBillPatient={handleBillPatient}
          onClose={handleClose}
        />
      ) : (
      <>
      <DialogTitle>
        <Typography variant="h6" fontWeight={700}>
          Register New Patient
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2.5}>
            {/* Row 1: Full Name (with salutation prefix selector) */}
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Controller
                  name="salutation"
                  control={control}
                  render={({ field }) => (
                    <FormControl size="small" sx={{ width: 110, flexShrink: 0 }}>
                      <InputLabel>Salutation</InputLabel>
                      <Select {...field} label="Salutation">
                        {['Mr', 'Mrs', 'Ms', 'Dr', 'Master', 'Baby'].map((s) => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Box ref={nameFieldRef} sx={{ position: 'relative', flex: 1 }}>
                      <TextField
                        {...field}
                        label="Full Name"
                        fullWidth
                        size="small"
                        required
                        autoComplete="off"
                        onChange={(e) => {
                          // Strip any non-letter/space/.'- characters, then title-case
                          const cleaned = e.target.value.replace(/[^A-Za-z\s.'-]/g, '');
                          const val = toTitleCase(cleaned);
                          field.onChange(val);
                          debouncedSetNameSearch(val);
                          setNameSuggestionsOpen(val.length >= 2);
                        }}
                        onFocus={() => { if (field.value.length >= 2) setNameSuggestionsOpen(true); }}
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                      <Popper
                        open={nameSuggestionsOpen && nameSuggestions.length > 0}
                        anchorEl={nameFieldRef.current}
                        placement="bottom-start"
                        sx={{ zIndex: 1500, width: nameFieldRef.current?.offsetWidth }}
                      >
                        <ClickAwayListener onClickAway={() => setNameSuggestionsOpen(false)}>
                          <Paper elevation={8} sx={{ maxHeight: 220, overflow: 'auto', border: '1px solid', borderColor: 'divider', mt: 0.5 }}>
                            <Typography variant="caption" sx={{ px: 1.5, pt: 1, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600 }}>
                              Existing patients
                            </Typography>
                            {nameSuggestionsLoading && (
                              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}><CircularProgress size={18} /></Box>
                            )}
                            {nameSuggestions.map((p) => (
                              <Box
                                key={p.patientId}
                                onClick={() => { toast.info(`Patient "${p.name}" already exists (${p.uhid}).`, { duration: 5000 }); setNameSuggestionsOpen(false); }}
                                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderBottom: '1px solid', borderColor: 'divider' }}
                              >
                                <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                                    {p.uhid && (
                                      <Chip
                                        label={p.uhid}
                                        size="small"
                                        sx={{
                                          height: 18,
                                          fontSize: '0.65rem',
                                          fontWeight: 600,
                                          bgcolor: 'primary.main',
                                          color: 'primary.contrastText',
                                        }}
                                      />
                                    )}
                                    {p.dateOfBirth && <Chip label={computeAge(p.dateOfBirth)} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
                                    {p.gender && <Chip label={p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
                                    {p.phone && <Chip label={p.phone} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />}
                                  </Box>
                                </Box>
                              </Box>
                            ))}
                          </Paper>
                        </ClickAwayListener>
                      </Popper>
                    </Box>
                  )}
                />
              </Stack>
            </Grid>

            {/* Row 2: Gender | DOB | Age */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <FormControl
                    component="fieldset"
                    size="small"
                    error={!!errors.gender}
                    sx={{
                      width: '100%',
                      border: '1px solid',
                      borderColor: errors.gender ? 'error.main' : 'rgba(0,0,0,0.23)',
                      borderRadius: 1,
                      px: 1.5,
                      pt: 0.25,
                      pb: 0.25,
                      height: 40,
                      display: 'flex',
                      justifyContent: 'center',
                      position: 'relative',
                      '&:hover': { borderColor: errors.gender ? 'error.main' : 'rgba(0,0,0,0.87)' },
                    }}
                  >
                    <FormLabel
                      component="legend"
                      required
                      sx={{
                        position: 'absolute',
                        top: -9,
                        left: 8,
                        px: 0.5,
                        bgcolor: 'background.paper',
                        fontSize: 12,
                        color: errors.gender ? 'error.main' : 'text.secondary',
                        '&.Mui-focused': { color: 'primary.main' },
                      }}
                    >
                      Gender
                    </FormLabel>
                    <RadioGroup
                      {...field}
                      row
                      sx={{ gap: 0.5, flexWrap: 'nowrap' }}
                    >
                      <FormControlLabel
                        value="M"
                        control={<Radio size="small" sx={{ py: 0.25 }} />}
                        label={<Typography variant="body2">Male</Typography>}
                        sx={{ mr: 1 }}
                      />
                      <FormControlLabel
                        value="F"
                        control={<Radio size="small" sx={{ py: 0.25 }} />}
                        label={<Typography variant="body2">Female</Typography>}
                        sx={{ mr: 1 }}
                      />
                      <FormControlLabel
                        value="Other"
                        control={<Radio size="small" sx={{ py: 0.25 }} />}
                        label={<Typography variant="body2">Other</Typography>}
                        sx={{ mr: 0 }}
                      />
                    </RadioGroup>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Controller
                name="dateOfBirth"
                control={control}
                render={({ field }) => {
                  const dateVal = field.value ? new Date(field.value) : null;
                  return (
                    <DatePicker
                      label="Date of Birth"
                      value={dateVal}
                      format="dd MMM yyyy"
                      maxDate={new Date()}
                      onChange={(newVal) => {
                        if (!newVal) { field.onChange(''); return; }
                        if (!isValid(newVal)) return;
                        if (newVal > new Date()) { toast.error('Date of birth cannot be in the future'); return; }
                        field.onChange(format(newVal, 'yyyy-MM-dd'));
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          required: true,
                          error: !!errors.dateOfBirth,
                          helperText: errors.dateOfBirth?.message,
                        },
                      }}
                    />
                  );
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Controller
                name="ageValue"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Age"
                    fullWidth
                    size="small"
                    required
                    slotProps={{
                      htmlInput: { inputMode: 'numeric', maxLength: 3 },
                      input: {
                        endAdornment: (
                          <InputAdornment position="end" sx={{ mr: -1 }}>
                            <Controller
                              name="ageUnit"
                              control={control}
                              render={({ field: unitField }) => (
                                <Select
                                  {...unitField}
                                  variant="standard"
                                  disableUnderline
                                  onChange={(e) => {
                                    const unit = e.target.value as AgeUnit;
                                    unitField.onChange(unit);
                                    if (ageValue) applyAgeToDob(ageValue, unit);
                                  }}
                                  sx={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: 'primary.main',
                                    '& .MuiSelect-select': { py: 0.5, pl: 1, pr: '20px !important' },
                                    '&:before, &:after': { display: 'none' },
                                  }}
                                >
                                  <MenuItem value="Years">Years</MenuItem>
                                  <MenuItem value="Months">Months</MenuItem>
                                  <MenuItem value="Days">Days</MenuItem>
                                </Select>
                              )}
                            />
                          </InputAdornment>
                        ),
                      },
                    }}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                      field.onChange(digits);
                      applyAgeToDob(digits, (ageUnitValue ?? 'Years') as AgeUnit);
                    }}
                  />
                )}
              />
            </Grid>

            {/* Row 3: Contact Number | Email */}
            <Grid size={{ xs: 12, sm: 6, md: 6 }}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Contact Number"
                    fullWidth
                    size="small"
                    required
                    slotProps={{
                      htmlInput: { inputMode: 'numeric', maxLength: 10 },
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <Typography variant="caption" sx={{ color: phoneCounterColor, fontWeight: 600 }}>
                              {phoneLen}/10
                            </Typography>
                          </InputAdornment>
                        ),
                      },
                    }}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    error={phoneTouched && phoneLen < 10}
                    helperText={
                      phoneTouched && phoneLen < 10
                        ? 'Phone must be 10 digits'
                        : errors.phone?.message
                    }
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 6 }}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email Address"
                    fullWidth
                    size="small"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />
            </Grid>

            {/* Row 4: Blood Group (small) | Address (wide) */}
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <Controller
                name="bloodGroup"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Blood Group"
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">Not specified</MenuItem>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                      <MenuItem key={bg} value={bg}>{bg}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 8, md: 9 }}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <Box ref={addressFieldRef}>
                    <TextField
                      {...field}
                      label="Address"
                      fullWidth
                      size="small"
                      placeholder="Start typing to search address..."
                      autoComplete="off"
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val);
                        fetchAddressPredictions(val);
                        setAddressSuggestionsOpen(val.trim().length >= 3);
                      }}
                      onFocus={() => { if (addressPredictions.length > 0) setAddressSuggestionsOpen(true); }}
                      slotProps={{
                        input: {
                          endAdornment: addressLoading ? (
                            <CircularProgress size={16} sx={{ mr: 1 }} />
                          ) : undefined,
                        },
                      }}
                    />
                    <Popper
                      open={addressSuggestionsOpen && (addressPredictions.length > 0 || addressLoading)}
                      anchorEl={addressFieldRef.current}
                      placement="bottom-start"
                      sx={{ zIndex: 1500, width: addressFieldRef.current?.offsetWidth }}
                    >
                      <ClickAwayListener onClickAway={() => setAddressSuggestionsOpen(false)}>
                        <Paper elevation={8} sx={{ maxHeight: 240, overflow: 'auto', border: '1px solid', borderColor: 'divider', mt: 0.5 }}>
                          {addressLoading && addressPredictions.length === 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                              <CircularProgress size={18} />
                            </Box>
                          )}
                          {addressPredictions.map((pred) => (
                            <Box
                              key={pred.placeId}
                              onClick={() => {
                                field.onChange(pred.description);
                                setAddressSuggestionsOpen(false);
                                setAddressPredictions([]);
                              }}
                              sx={{
                                px: 1.5,
                                py: 1,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' },
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              <Typography variant="body2" fontWeight={500} noWrap>
                                {pred.mainText}
                              </Typography>
                              {pred.secondaryText && (
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                  {pred.secondaryText}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Paper>
                      </ClickAwayListener>
                    </Popper>
                  </Box>
                )}
              />
            </Grid>

            {/* ─── Medical History Section ─────────────────────────────── */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <HistoryIcon sx={{ color: 'primary.main', fontSize: 20, mr: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600}>Patient Medical History</Typography>
                </Box>
                <FormControlLabel
                  control={<Checkbox checked={noRelevantHistory} onChange={(e) => setNoRelevantHistory(e.target.checked)} size="small" />}
                  label={<Typography variant="body2" color="text.secondary">No known medical history</Typography>}
                  sx={{ m: 0 }}
                />
              </Box>

              <Collapse in={!noRelevantHistory}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                  {medicalConditions.map((condition, index) => (
                    <ConditionCard
                      key={`${condition.name}-${index}`}
                      condition={condition}
                      index={index}
                      onValueChange={handleValueChange}
                      onSinceChange={handleSinceChange}
                    />
                  ))}
                </Box>
              </Collapse>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Registering...' : 'Register Patient'}
          </Button>
        </DialogActions>
      </form>
      </>
      )}

    </Dialog>
    </LocalizationProvider>
  );
}

// ─── Post-Register Action Selection Screen ──────────────────────────
interface ActionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
  primary?: boolean;
}

function ActionCard({ icon, title, description, color, onClick, primary }: ActionCardProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        p: 2.5,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: primary ? color : 'divider',
        bgcolor: primary ? `${color}10` : 'background.paper',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        height: '100%',
        '&:hover': {
          borderColor: color,
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${color}25`,
          bgcolor: `${color}08`,
        },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${color}18`,
          color,
          mb: 0.5,
        }}
      >
        {icon}
      </Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1f2937', fontSize: 15 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12.5, lineHeight: 1.4 }}>
        {description}
      </Typography>
    </Box>
  );
}

interface PostRegisterActionsProps {
  patient: Patient;
  onStartVisit: () => void;
  onAddToQueue: () => void;
  onBookAppointment: () => void;
  onViewAllPatients: () => void;
  onAddAnother: () => void;
  onBillPatient: () => void;
  onClose: () => void;
}

function PostRegisterActions({
  patient,
  onStartVisit,
  onAddToQueue,
  onBookAppointment,
  onViewAllPatients,
  onAddAnother,
  onBillPatient,
  onClose,
}: PostRegisterActionsProps) {
  return (
    <>
      <DialogContent sx={{ p: { xs: 3, sm: 4 } }}>
        {/* Success header */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
            }}
          >
            <CheckCircleIcon sx={{ color: '#10b981', fontSize: 36 }} />
          </Box>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1f2937' }}>
            Patient created successfully
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {patient.name}{patient.uhid ? ` · ${patient.uhid}` : ''}
            {patient.phone ? ` · ${patient.phone}` : ''}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: '#1f2937' }}>
          Choose your action
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <ActionCard
            icon={<MedicalServicesIcon sx={{ fontSize: 24 }} />}
            title="Start Visit"
            description="Open prescription pad for this patient"
            color="#0D7C66"
            primary
            onClick={onStartVisit}
          />
          <ActionCard
            icon={<PlaylistAddIcon sx={{ fontSize: 24 }} />}
            title="Add to Queue"
            description="Check this patient into today's queue"
            color="#1976D2"
            onClick={onAddToQueue}
          />
          <ActionCard
            icon={<EventAvailableIcon sx={{ fontSize: 24 }} />}
            title="Book Appointment"
            description="Schedule a future appointment"
            color="#7c3aed"
            onClick={onBookAppointment}
          />
          <ActionCard
            icon={<ReceiptLongIcon sx={{ fontSize: 24 }} />}
            title="Bill Patient"
            description="Create an invoice or collect payment"
            color="#ea580c"
            onClick={onBillPatient}
          />
          <ActionCard
            icon={<PeopleIcon sx={{ fontSize: 24 }} />}
            title="View All Patients"
            description="Go back to the patient directory"
            color="#475569"
            onClick={onViewAllPatients}
          />
          <ActionCard
            icon={<PersonAddIcon sx={{ fontSize: 24 }} />}
            title="Add Another Patient"
            description="Register a new patient right away"
            color="#0891b2"
            onClick={onAddAnother}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </>
  );
}
