import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  FileUpload as UploadIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import type { BulkImportRow, BulkImportSection, BulkImportValidationResult } from '@/types';
import { mastersApi } from '@/services/api';
import {
  SECTION_CONFIGS,
  validateAllRows,
  validateRow,
  rowToApiPayload,
} from './bulkImportConfig';
import UploadDropZone from './UploadDropZone';
import DataPreviewTable from './DataPreviewTable';
import {
  ConfirmInsertDialog,
  CancelConfirmDialog,
  ProcessingBackdrop,
  CancelProcessingDialog,
} from './ImportDialogs';

const MotionBox = motion.create(Box);

type Stage = 'upload' | 'preview' | 'processing';

interface BulkImportUploadProps {
  sectionKey: BulkImportSection;
}

export default function BulkImportUpload({ sectionKey }: BulkImportUploadProps) {
  const navigate = useNavigate();
  const config = SECTION_CONFIGS[sectionKey];

  // ─── State ───────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>('upload');
  // rows state is maintained via setRows for edits; read access is through validatedRows
  const [, setRows] = useState<BulkImportRow[]>([]);
  const [validatedRows, setValidatedRows] = useState<BulkImportValidationResult[]>([]);

  // Dialogs
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelProcessingOpen, setCancelProcessingOpen] = useState(false);

  // Abort controller for cancellation
  const abortRef = useRef<AbortController | null>(null);

  // ─── Navigation Guard ───────────────────────────────────────────
  const hasData = stage === 'preview' || stage === 'processing';

  // Set global flag so Sidebar can check before navigating
  useEffect(() => {
    if (hasData) {
      (window as unknown as Record<string, unknown>).__bulkImportActive = true;
    } else {
      (window as unknown as Record<string, unknown>).__bulkImportActive = false;
    }
    return () => {
      (window as unknown as Record<string, unknown>).__bulkImportActive = false;
    };
  }, [hasData]);

  // Block browser tab close / refresh
  useEffect(() => {
    if (!hasData) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasData]);

  // ─── Derived ─────────────────────────────────────────────────────
  const validCount = useMemo(() => validatedRows.filter(r => r.isValid).length, [validatedRows]);
  const invalidCount = useMemo(() => validatedRows.filter(r => !r.isValid).length, [validatedRows]);

  // ─── Handlers ────────────────────────────────────────────────────

  const handleDataParsed = useCallback(
    (parsedRows: BulkImportRow[]) => {
      setRows(parsedRows);
      const validated = validateAllRows(parsedRows, sectionKey);
      setValidatedRows(validated);
      setStage('preview');
    },
    [sectionKey],
  );

  const handleRowUpdate = useCallback(
    (rowIndex: number, key: string, value: string) => {
      setRows((prev) => {
        const updated = [...prev];
        updated[rowIndex] = { ...updated[rowIndex], [key]: value };
        return updated;
      });

      setValidatedRows((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex(r => r.rowIndex === rowIndex);
        if (idx !== -1) {
          const updatedRow = { ...updated[idx].row, [key]: value };
          updated[idx] = validateRow(updatedRow, sectionKey, rowIndex);
        }
        return updated;
      });
    },
    [sectionKey],
  );

  const handleInsertClick = useCallback(() => {
    if (validCount === 0) return;
    setConfirmOpen(true);
  }, [validCount]);

  const handleCancelClick = useCallback(() => {
    setCancelConfirmOpen(true);
  }, []);

  const handleConfirmInsert = useCallback(async () => {
    setConfirmOpen(false);
    setStage('processing');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const validRows = validatedRows.filter(r => r.isValid);
      const payload = validRows.map(r => rowToApiPayload(r.row, sectionKey));

      const result = await mastersApi.bulkImport(sectionKey, payload);

      if (controller.signal.aborted) return;

      const insertedCount = result.data?.inserted ?? validRows.length;
      const failedCount = result.data?.failed ?? 0;

      if (failedCount > 0) {
        toast.success(`Imported ${insertedCount} records. ${failedCount} failed.`);
      } else {
        toast.success(`Successfully imported ${insertedCount} ${config.label.toLowerCase()} records!`);
      }

      navigate('/profile/import-data');
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : 'Import failed. Please try again.';
      toast.error(message);
      setStage('preview');
    }
  }, [validatedRows, sectionKey, config.label, navigate]);

  const handleConfirmCancel = useCallback(() => {
    setCancelConfirmOpen(false);
    setStage('upload');
    setRows([]);
    setValidatedRows([]);
  }, []);

  const handleRequestCancelProcessing = useCallback(() => {
    setCancelProcessingOpen(true);
  }, []);

  const handleConfirmCancelProcessing = useCallback(() => {
    abortRef.current?.abort();
    setCancelProcessingOpen(false);
    setStage('preview');
    toast.info('Import cancelled');
  }, []);

  const handleRowDelete = useCallback((rowIndex: number) => {
    setRows((prev) => prev.filter((_, i) => i !== rowIndex));
    setValidatedRows((prev) => {
      const filtered = prev.filter(r => r.rowIndex !== rowIndex);
      // Re-index remaining rows
      return filtered.map((r, i) => ({ ...r, rowIndex: i }));
    });
  }, []);

  const handleReupload = useCallback(() => {
    setStage('upload');
    setRows([]);
    setValidatedRows([]);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1 }}>
        <Link
          underline="hover"
          color="text.secondary"
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
          onClick={() => navigate('/profile')}
        >
          Profile
        </Link>
        <Link
          underline="hover"
          color="text.secondary"
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
          onClick={() => navigate('/profile/import-data')}
        >
          Import Data
        </Link>
        <Typography color="text.primary" fontWeight={600}>
          {config.label}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, mt: 1 }}>
        <Button
          variant="text"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/profile/import-data')}
          sx={{ minWidth: 'auto', color: 'text.secondary' }}
        >
          Back
        </Button>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Import {config.label}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Upload an Excel file to import {config.label.toLowerCase()} records
          </Typography>
        </Box>
      </Box>

      {/* Stage: Upload */}
      {stage === 'upload' && (
        <MotionBox
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <UploadDropZone sectionKey={sectionKey} onDataParsed={handleDataParsed} />
        </MotionBox>
      )}

      {/* Stage: Preview */}
      {stage === 'preview' && (
        <MotionBox
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DataPreviewTable
            sectionKey={sectionKey}
            validatedRows={validatedRows}
            onRowUpdate={handleRowUpdate}
            onRowDelete={handleRowDelete}
          />

          {/* Action buttons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 2.5,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" color="inherit" onClick={handleCancelClick}>
                Cancel
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={handleReupload}
              >
                Upload Different File
              </Button>
            </Box>
            <Button
              variant="contained"
              disabled={validCount === 0}
              onClick={handleInsertClick}
              sx={{
                px: 4,
                background: validCount > 0
                  ? 'linear-gradient(135deg, #0D7C66 0%, #17B890 100%)'
                  : undefined,
                '&:hover': validCount > 0
                  ? { background: 'linear-gradient(135deg, #095C4B 0%, #0D7C66 100%)' }
                  : undefined,
              }}
            >
              Insert {validCount} Valid Record{validCount !== 1 ? 's' : ''}
            </Button>
          </Box>
        </MotionBox>
      )}

      {/* Dialogs */}
      <ConfirmInsertDialog
        open={confirmOpen}
        validCount={validCount}
        invalidCount={invalidCount}
        onConfirm={handleConfirmInsert}
        onCancel={() => setConfirmOpen(false)}
      />
      <CancelConfirmDialog
        open={cancelConfirmOpen}
        onConfirmCancel={handleConfirmCancel}
        onGoBack={() => setCancelConfirmOpen(false)}
      />
      <ProcessingBackdrop
        open={stage === 'processing'}
        count={validCount}
        onRequestCancel={handleRequestCancelProcessing}
      />
      <CancelProcessingDialog
        open={cancelProcessingOpen}
        onConfirm={handleConfirmCancelProcessing}
        onGoBack={() => setCancelProcessingOpen(false)}
      />

    </Box>
  );
}
