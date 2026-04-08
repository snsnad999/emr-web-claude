import { useCallback, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  alpha,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import type { BulkImportRow, BulkImportSection } from '@/types';
import { SECTION_CONFIGS, isEmptyRow, type ColumnDef } from './bulkImportConfig';

interface UploadDropZoneProps {
  sectionKey: BulkImportSection;
  onDataParsed: (rows: BulkImportRow[]) => void;
}

/** Map Excel headers (case-insensitive) to our column keys */
function mapHeaders(
  excelHeaders: string[],
  columns: ColumnDef[],
): Record<number, string> {
  const mapping: Record<number, string> = {};

  excelHeaders.forEach((header, idx) => {
    const normalized = header.toLowerCase().trim();
    for (const col of columns) {
      if (col.excelHeaders.includes(normalized)) {
        mapping[idx] = col.key;
        break;
      }
    }
  });

  return mapping;
}

function generateTemplate(sectionKey: BulkImportSection) {
  const config = SECTION_CONFIGS[sectionKey];
  const headers = config.columns.map(c => c.label);

  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, config.label);

  // Set column widths
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));

  XLSX.writeFile(wb, `${config.label}_Template.xlsx`);
}

export default function UploadDropZone({ sectionKey, onDataParsed }: UploadDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const config = SECTION_CONFIGS[sectionKey];

  const processFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        if (!data) return;

        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rawRows.length < 2) {
          onDataParsed([]);
          return;
        }

        const excelHeaders = (rawRows[0] || []).map(h => String(h));
        const headerMap = mapHeaders(excelHeaders, config.columns);

        const parsedRows: BulkImportRow[] = [];
        for (let i = 1; i < rawRows.length; i++) {
          const rawRow = rawRows[i];
          if (!rawRow || rawRow.length === 0) continue;

          const row: BulkImportRow = {};
          for (const col of config.columns) {
            row[col.key] = '';
          }

          for (const [colIdx, key] of Object.entries(headerMap)) {
            const cellValue = rawRow[Number(colIdx)];
            row[key] = cellValue != null ? String(cellValue).trim() : '';
          }

          if (!isEmptyRow(row, sectionKey)) {
            parsedRows.push(row);
          }
        }

        onDataParsed(parsedRows);
      };
      reader.readAsArrayBuffer(file);
    },
    [config.columns, sectionKey, onDataParsed],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  return (
    <Box>
      {/* Drop zone */}
      <Box
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        sx={{
          border: '2px dashed',
          borderColor: isDragging ? 'primary.main' : 'divider',
          borderRadius: 3,
          p: 5,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragging ? (t) => alpha(t.palette.primary.main, 0.04) : 'background.paper',
          transition: 'all 200ms ease',
          '&:hover': {
            borderColor: 'primary.light',
            bgcolor: (t) => alpha(t.palette.primary.main, 0.02),
          },
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={handleFileChange}
        />

        {fileName ? (
          <>
            <FileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="subtitle1" fontWeight={600}>
              {fileName}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Click or drop another file to replace
            </Typography>
          </>
        ) : (
          <>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
            <Typography variant="subtitle1" fontWeight={600}>
              Drag & drop your Excel file here
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2 }}>
              or click to browse. Accepts .xlsx, .xls, .csv
            </Typography>
            <Button variant="outlined" size="small" sx={{ pointerEvents: 'none' }}>
              Choose File
            </Button>
          </>
        )}
      </Box>

      {/* Expected columns + download template */}
      <Box
        sx={{
          mt: 2.5,
          p: 2,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle2" fontWeight={600}>
              Expected columns
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            onClick={(e) => {
              e.stopPropagation();
              generateTemplate(sectionKey);
            }}
            sx={{ fontSize: '0.8rem' }}
          >
            Download Template
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {config.columns.map((col) => (
            <Chip
              key={col.key}
              label={col.required ? `${col.label} *` : col.label}
              size="small"
              variant={col.required ? 'filled' : 'outlined'}
              sx={{
                fontWeight: col.required ? 600 : 400,
                bgcolor: col.required ? 'primary.main' : undefined,
                color: col.required ? '#fff' : 'text.secondary',
                borderColor: col.required ? undefined : 'divider',
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
