import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Backdrop,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

// ─── Confirm Insert Dialog ───────────────────────────────────────────

interface ConfirmInsertDialogProps {
  open: boolean;
  validCount: number;
  invalidCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmInsertDialog({
  open,
  validCount,
  invalidCount,
  onConfirm,
  onCancel,
}: ConfirmInsertDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <CheckIcon sx={{ color: 'success.main', fontSize: 28 }} />
        Confirm Import
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Are you sure you want to insert{' '}
          <Typography component="span" fontWeight={700} color="success.main">
            {validCount} valid
          </Typography>{' '}
          records?
        </Typography>
        {invalidCount > 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {invalidCount} invalid row{invalidCount !== 1 ? 's' : ''} will be skipped.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCancel} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #0D7C66 0%, #17B890 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #095C4B 0%, #0D7C66 100%)' },
          }}
        >
          Confirm Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Cancel Confirmation Dialog ──────────────────────────────────────

interface CancelConfirmDialogProps {
  open: boolean;
  onConfirmCancel: () => void;
  onGoBack: () => void;
}

export function CancelConfirmDialog({
  open,
  onConfirmCancel,
  onGoBack,
}: CancelConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onGoBack} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <WarningIcon sx={{ color: 'warning.main', fontSize: 28 }} />
        Discard Import?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          Are you sure you don&apos;t want to insert any data? All changes will be lost.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onGoBack} color="inherit">
          Go Back
        </Button>
        <Button
          onClick={onConfirmCancel}
          variant="contained"
          color="error"
        >
          Yes, Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Processing Backdrop / Cancel Dialog ─────────────────────────────

interface ProcessingBackdropProps {
  open: boolean;
  count: number;
  onRequestCancel: () => void;
}

export function ProcessingBackdrop({
  open,
  count,
  onRequestCancel,
}: ProcessingBackdropProps) {
  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (t) => t.zIndex.modal + 1,
        color: '#fff',
        flexDirection: 'column',
        gap: 2,
        bgcolor: 'rgba(0, 0, 0, 0.7)',
      }}
    >
      <CircularProgress color="inherit" size={56} thickness={4} />
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" fontWeight={600}>
          Processing data...
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
          Importing {count} records
        </Typography>
      </Box>
      <Button
        variant="outlined"
        color="inherit"
        onClick={onRequestCancel}
        sx={{ mt: 1, borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#fff' } }}
      >
        Cancel
      </Button>
    </Backdrop>
  );
}

// ─── Cancel Processing Dialog ────────────────────────────────────────

interface CancelProcessingDialogProps {
  open: boolean;
  onConfirm: () => void;
  onGoBack: () => void;
}

export function CancelProcessingDialog({
  open,
  onConfirm,
  onGoBack,
}: CancelProcessingDialogProps) {
  return (
    <Dialog open={open} onClose={onGoBack} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <WarningIcon sx={{ color: 'error.main', fontSize: 28 }} />
        Stop Import?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          Are you sure you want to cancel? This will stop the import.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onGoBack} color="inherit">
          Go Back
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error">
          Stop Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}
