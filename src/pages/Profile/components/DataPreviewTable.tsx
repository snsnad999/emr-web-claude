import { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Paper,
  alpha,
  TablePagination,
  IconButton,
} from '@mui/material';
import {
  Circle as CircleIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import type { BulkImportSection, BulkImportValidationResult } from '@/types';
import { SECTION_CONFIGS, validateRow } from './bulkImportConfig';

interface DataPreviewTableProps {
  sectionKey: BulkImportSection;
  validatedRows: BulkImportValidationResult[];
  onRowUpdate: (rowIndex: number, key: string, value: string) => void;
  onRowDelete: (rowIndex: number) => void;
}

export default function DataPreviewTable({
  sectionKey,
  validatedRows,
  onRowUpdate,
  onRowDelete,
}: DataPreviewTableProps) {
  const config = SECTION_CONFIGS[sectionKey];
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const validCount = useMemo(() => validatedRows.filter(r => r.isValid).length, [validatedRows]);
  const invalidCount = useMemo(() => validatedRows.filter(r => !r.isValid).length, [validatedRows]);

  const paginatedRows = useMemo(
    () => validatedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [validatedRows, page, rowsPerPage],
  );

  const handleChangePage = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  return (
    <Box>
      {/* Summary bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 2,
          p: 1.5,
          px: 2,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'text.secondary' }}>
          {validatedRows.length} rows found
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Chip
          icon={<CircleIcon sx={{ fontSize: '10px !important', color: '#27AE60 !important' }} />}
          label={`${validCount} valid`}
          size="small"
          sx={{
            bgcolor: (t) => alpha(t.palette.success.main, 0.08),
            color: 'success.main',
            fontWeight: 600,
          }}
        />
        {invalidCount > 0 && (
          <Chip
            icon={<CircleIcon sx={{ fontSize: '10px !important', color: '#D63031 !important' }} />}
            label={`${invalidCount} with issues`}
            size="small"
            sx={{
              bgcolor: (t) => alpha(t.palette.error.main, 0.08),
              color: 'error.main',
              fontWeight: 600,
            }}
          />
        )}
      </Box>

      {/* Table */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          maxHeight: 480,
          borderRadius: 2,
          '& .MuiTableCell-root': { py: 1, px: 1.5 },
        }}
      >
        <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 44 }}>#</TableCell>
              <TableCell sx={{ width: 52 }}>Status</TableCell>
              {config.columns.map((col) => (
                <TableCell key={col.key} sx={{ fontWeight: 600 }}>
                  {col.label}
                  {col.required && (
                    <Typography component="span" sx={{ color: 'error.main', ml: 0.25 }}>
                      *
                    </Typography>
                  )}
                </TableCell>
              ))}
              <TableCell sx={{ width: 48 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.map((vr) => (
              <TableRow
                key={vr.rowIndex}
                sx={{
                  bgcolor: vr.isValid ? undefined : (t) => alpha(t.palette.error.main, 0.03),
                  '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
                }}
              >
                <TableCell>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {vr.rowIndex + 1}
                  </Typography>
                </TableCell>
                <TableCell>
                  {vr.isValid ? (
                    <CircleIcon sx={{ fontSize: 12, color: '#27AE60' }} />
                  ) : (
                    <Tooltip
                      title={
                        <Box>
                          {vr.errors.map((err, i) => (
                            <Typography key={i} variant="caption" display="block">
                              {err}
                            </Typography>
                          ))}
                        </Box>
                      }
                      arrow
                    >
                      <CircleIcon sx={{ fontSize: 12, color: '#D63031', cursor: 'pointer' }} />
                    </Tooltip>
                  )}
                </TableCell>
                {config.columns.map((col) => {
                  const cellValue = vr.row[col.key] ?? '';
                  const hasError = col.required && !cellValue.trim();
                  return (
                    <TableCell key={col.key}>
                      <EditableCell
                        value={cellValue}
                        hasError={hasError}
                        onChange={(newVal) => onRowUpdate(vr.rowIndex, col.key, newVal)}
                      />
                    </TableCell>
                  );
                })}
                <TableCell>
                  <Tooltip title="Delete row" arrow>
                    <IconButton
                      size="small"
                      onClick={() => onRowDelete(vr.rowIndex)}
                      sx={{
                        color: 'text.disabled',
                        '&:hover': { color: 'error.main' },
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {validatedRows.length > 25 && (
        <TablePagination
          component="div"
          count={validatedRows.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            '.MuiTablePagination-toolbar': { minHeight: 44 },
          }}
        />
      )}
    </Box>
  );
}

// ─── Inline Editable Cell ────────────────────────────────────────────

interface EditableCellProps {
  value: string;
  hasError: boolean;
  onChange: (value: string) => void;
}

function EditableCell({ value, hasError, onChange }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = () => {
    setEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setLocalValue(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <TextField
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        size="small"
        variant="outlined"
        error={hasError && !localValue.trim()}
        sx={{
          '& .MuiOutlinedInput-root': { fontSize: '0.82rem' },
          '& .MuiOutlinedInput-input': { py: 0.5, px: 1 },
          minWidth: 100,
        }}
      />
    );
  }

  return (
    <Box
      onClick={() => {
        setLocalValue(value);
        setEditing(true);
      }}
      sx={{
        px: 1,
        py: 0.4,
        borderRadius: 1,
        minHeight: 28,
        display: 'flex',
        alignItems: 'center',
        cursor: 'text',
        fontSize: '0.82rem',
        color: value ? 'text.primary' : 'text.disabled',
        bgcolor: hasError ? (t) => alpha(t.palette.error.main, 0.06) : 'transparent',
        border: '1px solid',
        borderColor: hasError ? (t) => alpha(t.palette.error.main, 0.3) : 'transparent',
        '&:hover': {
          bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
          borderColor: 'divider',
        },
        transition: 'all 150ms ease',
      }}
    >
      {value || (
        <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
          Click to edit
        </Typography>
      )}
    </Box>
  );
}

// Export for use in validation re-computation
export { validateRow };
