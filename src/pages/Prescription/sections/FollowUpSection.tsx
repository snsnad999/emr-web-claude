import {
  Grid, TextField, Button, FormControlLabel, Switch, Typography,
  Chip, Stack,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { format, isValid } from 'date-fns';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import SectionHeader from '../components/SectionHeader';
import { usePrescription } from '../context/PrescriptionContext';

const QUICK_DURATIONS = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
];

export default function FollowUpSection() {
  const { followUp, setFollowUp } = usePrescription();

  const addDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setFollowUp({
      followUpDate: date.toISOString().slice(0, 10),
      date: date.toISOString().slice(0, 10),
      notes: followUp?.notes || '',
      notificationEnabled: followUp?.notificationEnabled ?? true,
    });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <SectionHeader id="followUp" title="Follow-Up" icon={<EventIcon />} itemCount={followUp ? 1 : 0}>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>Quick set:</Typography>
        {QUICK_DURATIONS.map(d => (
          <Chip
            key={d.label}
            label={d.label}
            onClick={() => addDays(d.days)}
            variant={followUp?.followUpDate ? 'outlined' : 'filled'}
            size="small"
            clickable
          />
        ))}
      </Stack>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <DatePicker
            label="Follow-Up Date"
            format="dd/MM/yyyy"
            value={followUp?.followUpDate ? new Date(followUp.followUpDate + 'T00:00:00') : null}
            onChange={(newVal) => {
              if (!newVal || !isValid(newVal)) {
                setFollowUp(null);
                return;
              }
              const iso = format(newVal, 'yyyy-MM-dd');
              setFollowUp({
                followUpDate: iso,
                date: iso,
                notes: followUp?.notes || '',
                notificationEnabled: followUp?.notificationEnabled ?? true,
              });
            }}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Notes"
            value={followUp?.notes || ''}
            onChange={e => setFollowUp(followUp ? { ...followUp, notes: e.target.value } : null)}
            size="small" fullWidth multiline rows={2}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={followUp?.notificationEnabled ?? false}
                onChange={e => followUp && setFollowUp({ ...followUp, notificationEnabled: e.target.checked })}
              />
            }
            label={<Typography variant="body2">Notify</Typography>}
          />
        </Grid>
      </Grid>
      {followUp && (
        <Button size="small" color="error" onClick={() => setFollowUp(null)} sx={{ mt: 1 }}>
          Clear Follow-Up
        </Button>
      )}
    </SectionHeader>
    </LocalizationProvider>
  );
}
