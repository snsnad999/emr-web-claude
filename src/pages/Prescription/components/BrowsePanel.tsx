import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Drawer, Box, Typography, IconButton, TextField, Button,
  Accordion, AccordionSummary, AccordionDetails,
  Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Tooltip, Divider, InputAdornment, Stack, MenuItem,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { LabResult } from '@/types';

// ─── Test Panel Definitions ──────────────────────────────────────────
interface SubTest {
  name: string;
  units: string[];      // one per date column
  values: string[];     // one per date column
  normalRange?: { min: number; max: number };
  defaultUnit: string;
}

interface TestPanel {
  name: string;
  color: string;
  subTests: SubTest[];
}

function makeSubTest(name: string, defaultUnit: string, min?: number, max?: number): SubTest {
  return {
    name,
    units: [defaultUnit],
    values: [''],
    normalRange: min !== undefined && max !== undefined ? { min, max } : undefined,
    defaultUnit,
  };
}

const INITIAL_PANELS: TestPanel[] = [
  {
    name: 'Complete Blood Count (CBC)', color: '#ef4444',
    subTests: [
      makeSubTest('Hb (Hemoglobin)', 'g/dL', 12, 17),
      makeSubTest('RBC Count', 'million/uL', 4.2, 5.8),
      makeSubTest('WBC Count', '/uL', 4000, 11000),
      makeSubTest('Platelets', '/uL', 150000, 400000),
      makeSubTest('PCV / Hematocrit', '%', 36, 50),
      makeSubTest('MCV', 'fL', 80, 100),
      makeSubTest('MCH', 'pg', 27, 33),
      makeSubTest('MCHC', 'g/dL', 32, 36),
      makeSubTest('RDW', '%', 11.5, 14.5),
      makeSubTest('Neutrophils', '%', 40, 70),
      makeSubTest('Lymphocytes', '%', 20, 40),
      makeSubTest('Monocytes', '%', 2, 8),
      makeSubTest('Eosinophils', '%', 1, 4),
      makeSubTest('Basophils', '%', 0, 1),
      makeSubTest('ESR', 'mm/hr', 0, 20),
      makeSubTest('Reticulocyte Count', '%', 0.5, 2.5),
    ],
  },
  {
    name: 'Diabetes Profile', color: '#f59e0b',
    subTests: [
      makeSubTest('HbA1c', '%', 4, 5.6),
      makeSubTest('Fasting Blood Sugar', 'mg/dL', 70, 100),
      makeSubTest('Post Prandial Blood Sugar', 'mg/dL', 70, 140),
      makeSubTest('Random Blood Sugar', 'mg/dL', 70, 200),
    ],
  },
  {
    name: 'Urine Routine and Microscopy', color: '#06b6d4',
    subTests: [
      makeSubTest('Colour', ''),
      makeSubTest('Appearance', ''),
      makeSubTest('Specific Gravity', '', 1.005, 1.030),
      makeSubTest('pH', '', 4.5, 8.0),
      makeSubTest('Protein', 'mg/dL'),
      makeSubTest('Glucose', 'mg/dL'),
      makeSubTest('Ketones', ''),
      makeSubTest('Bilirubin', ''),
      makeSubTest('Urobilinogen', 'mg/dL'),
      makeSubTest('Blood / Hb', ''),
      makeSubTest('Nitrite', ''),
      makeSubTest('Leucocyte Esterase', ''),
      makeSubTest('Pus Cells (WBC)', '/HPF', 0, 5),
      makeSubTest('RBC', '/HPF', 0, 2),
      makeSubTest('Epithelial Cells', '/HPF'),
      makeSubTest('Casts', '/LPF'),
      makeSubTest('Crystals', ''),
    ],
  },
  {
    name: 'Kidney Function Test', color: '#8b5cf6',
    subTests: [
      makeSubTest('Creatinine', 'mg/dL', 0.6, 1.2),
      makeSubTest('Blood Urea Nitrogen', 'mg/dL', 7, 20),
      makeSubTest('Uric Acid', 'mg/dL', 3.5, 7.2),
      makeSubTest('eGFR', 'mL/min', 90, 120),
    ],
  },
  {
    name: 'Liver Function Test', color: '#10b981',
    subTests: [
      makeSubTest('ALT (SGPT)', 'U/L', 7, 56),
      makeSubTest('AST (SGOT)', 'U/L', 10, 40),
      makeSubTest('ALP', 'U/L', 44, 147),
      makeSubTest('Total Bilirubin', 'mg/dL', 0.1, 1.2),
      makeSubTest('Direct Bilirubin', 'mg/dL', 0, 0.3),
      makeSubTest('Albumin', 'g/dL', 3.5, 5.0),
      makeSubTest('Total Protein', 'g/dL', 6.0, 8.3),
      makeSubTest('GGT', 'U/L', 9, 48),
    ],
  },
  {
    name: 'Lipid Profile', color: '#3b82f6',
    subTests: [
      makeSubTest('Total Cholesterol', 'mg/dL', 0, 200),
      makeSubTest('HDL Cholesterol', 'mg/dL', 40, 60),
      makeSubTest('LDL Cholesterol', 'mg/dL', 0, 100),
      makeSubTest('Triglycerides', 'mg/dL', 0, 150),
      makeSubTest('VLDL', 'mg/dL', 5, 40),
    ],
  },
  {
    name: 'Thyroid Function Profile', color: '#d946ef',
    subTests: [
      makeSubTest('TSH', 'mIU/L', 0.4, 4.0),
      makeSubTest('Free T4', 'ng/dL', 0.8, 1.8),
      makeSubTest('Free T3', 'pg/mL', 2.3, 4.2),
      makeSubTest('Total T4', 'ug/dL', 5.0, 12.0),
      makeSubTest('Total T3', 'ng/dL', 80, 200),
    ],
  },
  {
    name: 'Fertility / PCOS Profile', color: '#f97316',
    subTests: [
      makeSubTest('FSH', 'mIU/mL', 1.5, 12.4),
      makeSubTest('LH', 'mIU/mL', 1.7, 8.6),
      makeSubTest('Testosterone', 'ng/dL', 15, 70),
      makeSubTest('Prolactin', 'ng/mL', 2, 29),
      makeSubTest('DHEA-S', 'ug/dL', 35, 430),
    ],
  },
  {
    name: 'Blood Group & Serology', color: '#dc2626',
    subTests: [
      makeSubTest('Blood Group', ''),
      makeSubTest('Rh Factor', ''),
      makeSubTest('HIV I & II', ''),
      makeSubTest('HBsAg', ''),
      makeSubTest('HCV', ''),
      makeSubTest('VDRL', ''),
    ],
  },
  {
    name: 'Serum Electrolytes', color: '#0ea5e9',
    subTests: [
      makeSubTest('Sodium', 'mEq/L', 136, 145),
      makeSubTest('Potassium', 'mEq/L', 3.5, 5.0),
      makeSubTest('Chloride', 'mEq/L', 98, 106),
      makeSubTest('Calcium', 'mg/dL', 8.5, 10.5),
      makeSubTest('Magnesium', 'mg/dL', 1.7, 2.2),
      makeSubTest('Phosphorus', 'mg/dL', 2.5, 4.5),
      makeSubTest('Bicarbonate', 'mEq/L', 22, 29),
    ],
  },
  {
    name: 'Vitamins & Minerals', color: '#22c55e',
    subTests: [
      makeSubTest('Vitamin D (25-OH)', 'ng/mL', 30, 100),
      makeSubTest('Vitamin B12', 'pg/mL', 200, 900),
      makeSubTest('Folate', 'ng/mL', 2.7, 17.0),
      makeSubTest('Serum Calcium', 'mg/dL', 8.5, 10.5),
      makeSubTest('Serum Iron', 'ug/dL', 60, 170),
    ],
  },
  {
    name: 'Fever Profile', color: '#f43f5e',
    subTests: [
      makeSubTest('CBC (refer above)', ''),
      makeSubTest('Malaria Antigen', ''),
      makeSubTest('Typhoid IgM (Widal)', ''),
      makeSubTest('Dengue NS1 Ag', ''),
      makeSubTest('Dengue IgM', ''),
      makeSubTest('Dengue IgG', ''),
    ],
  },
  {
    name: 'Iron Profile', color: '#a855f7',
    subTests: [
      makeSubTest('Serum Iron', 'ug/dL', 60, 170),
      makeSubTest('TIBC', 'ug/dL', 250, 370),
      makeSubTest('Ferritin', 'ng/mL', 12, 300),
      makeSubTest('Transferrin Saturation', '%', 20, 50),
    ],
  },
  {
    name: 'Pulmonary Function Tests', color: '#64748b',
    subTests: [
      makeSubTest('FEV1', 'L'),
      makeSubTest('FVC', 'L'),
      makeSubTest('FEV1/FVC Ratio', '%', 70, 100),
      makeSubTest('DLCO', 'mL/min/mmHg'),
      makeSubTest('Peak Expiratory Flow', 'L/min'),
    ],
  },
];

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Component ─────────────────────────────────────────────────────
interface BrowsePanelProps {
  open: boolean;
  onClose: () => void;
  onSave: (results: LabResult[]) => void;
  dropdownOptions?: Record<string, Record<string, { dropdown_option_id: number; option_value: string; applies_to?: string[] }[]>> | null;
}

export default function BrowsePanel({ open, onClose, onSave, dropdownOptions }: BrowsePanelProps) {
  const [panels, setPanels] = useState<TestPanel[]>([]);
  const [dates, setDates] = useState<string[]>([formatDate(new Date())]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filledLabs, setFilledLabs] = useState(0);
  const [outOfRange, setOutOfRange] = useState(0);

  // Init panels on open
  useEffect(() => {
    if (open) {
      setPanels(INITIAL_PANELS.map(p => ({
        ...p,
        subTests: p.subTests.map(s => ({ ...s, values: [''], units: [s.defaultUnit] })),
      })));
      setDates([formatDate(new Date())]);
      setSearchTerm('');
    }
  }, [open]);

  // Recalculate counters when values change
  useEffect(() => {
    let filled = 0;
    let oor = 0;
    panels.forEach(panel => {
      panel.subTests.forEach(sub => {
        sub.values.forEach(v => {
          if (v.trim()) {
            filled++;
            const num = parseFloat(v);
            if (!isNaN(num) && sub.normalRange) {
              if (num < sub.normalRange.min || num > sub.normalRange.max) oor++;
            }
          }
        });
      });
    });
    setFilledLabs(filled);
    setOutOfRange(oor);
  }, [panels]);

  // Handle value change
  const handleValueChange = useCallback((panelIdx: number, subIdx: number, dateIdx: number, value: string) => {
    setPanels(prev => prev.map((p, pi) =>
      pi !== panelIdx ? p : {
        ...p,
        subTests: p.subTests.map((s, si) =>
          si !== subIdx ? s : {
            ...s,
            values: s.values.map((v, di) => di === dateIdx ? value : v),
          }
        ),
      }
    ));
  }, []);

  // Handle unit change
  const handleUnitChange = useCallback((panelIdx: number, subIdx: number, dateIdx: number, unit: string) => {
    setPanels(prev => prev.map((p, pi) =>
      pi !== panelIdx ? p : {
        ...p,
        subTests: p.subTests.map((s, si) =>
          si !== subIdx ? s : {
            ...s,
            units: s.units.map((u, di) => di === dateIdx ? unit : u),
          }
        ),
      }
    ));
  }, []);

  // Add date column
  const handleAddDate = useCallback(() => {
    const newDate = formatDate(new Date());
    setDates(d => [...d, newDate]);
    setPanels(prev => prev.map(panel => ({
      ...panel,
      subTests: panel.subTests.map(sub => ({
        ...sub,
        values: [...sub.values, ''],
        units: [...sub.units, sub.defaultUnit],
      })),
    })));
  }, []);

  // Remove date column
  const handleRemoveDate = useCallback((dateIdx: number) => {
    if (dates.length <= 1) return;
    setDates(d => d.filter((_, i) => i !== dateIdx));
    setPanels(prev => prev.map(panel => ({
      ...panel,
      subTests: panel.subTests.map(sub => ({
        ...sub,
        values: sub.values.filter((_, i) => i !== dateIdx),
        units: sub.units.filter((_, i) => i !== dateIdx),
      })),
    })));
  }, [dates.length]);

  // Get trend arrow between columns
  const getArrow = (values: string[], dateIdx: number) => {
    if (dateIdx === 0) return null;
    const prev = parseFloat(values[dateIdx - 1]);
    const curr = parseFloat(values[dateIdx]);
    if (isNaN(prev) || isNaN(curr)) return null;
    if (curr > prev) return <ArrowUpwardIcon sx={{ fontSize: 14, color: 'error.main' }} />;
    if (curr < prev) return <ArrowDownwardIcon sx={{ fontSize: 14, color: 'success.main' }} />;
    return null;
  };

  // Check if value is out of range
  const isOutOfRange = (value: string, normalRange?: { min: number; max: number }) => {
    if (!normalRange || !value.trim()) return false;
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    return num < normalRange.min || num > normalRange.max;
  };

  // Get unit options for a test
  const getUnitOptions = useCallback((testName: string): string[] => {
    const unitOpts = dropdownOptions?.labresult?.unit || dropdownOptions?.lab_result?.unit;
    if (!unitOpts) return [];
    return unitOpts
      .filter(o => {
        const appliesTo = o.applies_to || [];
        return appliesTo.length === 0 || appliesTo.includes(testName);
      })
      .map(o => o.option_value);
  }, [dropdownOptions]);

  // Filter panels by search
  const filteredPanels = useMemo(() => {
    if (!searchTerm.trim()) return panels;
    const q = searchTerm.toLowerCase();
    return panels.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.subTests.some(s => s.name.toLowerCase().includes(q))
    );
  }, [panels, searchTerm]);

  // Count filled per panel
  const panelFilledCount = useCallback((panel: TestPanel) => {
    return panel.subTests.reduce((count, sub) =>
      count + sub.values.filter(v => v.trim()).length, 0
    );
  }, []);

  // Save
  const handleSave = useCallback(() => {
    const results: LabResult[] = [];
    panels.forEach(panel => {
      panel.subTests.forEach(sub => {
        sub.values.forEach((val, dateIdx) => {
          if (val.trim()) {
            results.push({
              testName: `${sub.name} (${panel.name})`,
              reading: val,
              unit: sub.units[dateIdx] || sub.defaultUnit,
              normalRange: sub.normalRange
                ? `${sub.normalRange.min} - ${sub.normalRange.max}`
                : '',
              interpretation: isOutOfRange(val, sub.normalRange) ? 'Abnormal' : 'Normal',
              date: dates[dateIdx] || '',
              notes: '',
            });
          }
        });
      });
    });
    onSave(results);
    onClose();
  }, [panels, dates, onSave, onClose]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 700, md: 820 } } } }}
    >
      {/* Header */}
      <Box sx={{
        px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
        flexShrink: 0,
      }}>
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
          Browse Lab Panels
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {filledLabs > 0 && (
            <Chip
              icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
              label={`${filledLabs} filled`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {outOfRange > 0 && (
            <Chip
              icon={<WarningAmberIcon sx={{ fontSize: 16 }} />}
              label={`${outOfRange} out of range`}
              size="small"
              color="error"
              variant="outlined"
            />
          )}
        </Stack>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Search + Date controls */}
      <Box sx={{ px: 2.5, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          size="small"
          placeholder="Search panels or tests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <Divider orientation="vertical" flexItem />
        <Typography variant="caption" color="text.secondary" noWrap>
          Date columns:
        </Typography>
        {dates.map((d, i) => (
          <Chip
            key={i}
            label={d}
            size="small"
            variant="outlined"
            onDelete={dates.length > 1 ? () => handleRemoveDate(i) : undefined}
            sx={{ fontSize: 11 }}
          />
        ))}
        <Tooltip title="Add date column for trending">
          <IconButton size="small" onClick={handleAddDate} color="primary">
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Panel list */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1, py: 1 }}>
        {filteredPanels.map((panel) => {
          const realIdx = panels.indexOf(panel);
          const filled = panelFilledCount(panel);
          return (
            <Accordion key={panel.name} disableGutters sx={{ mb: 0.5, '&:before': { display: 'none' } }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: 44,
                  '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1 },
                }}
              >
                <Box sx={{ width: 4, height: 28, borderRadius: 1, bgcolor: panel.color, mr: 1, flexShrink: 0 }} />
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                  {panel.name}
                </Typography>
                <Chip
                  label={`${panel.subTests.length} tests`}
                  size="small"
                  sx={{ fontSize: 11, height: 22 }}
                  variant="outlined"
                />
                {filled > 0 && (
                  <Chip
                    label={`${filled} filled`}
                    size="small"
                    color="primary"
                    sx={{ fontSize: 11, height: 22 }}
                  />
                )}
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, overflow: 'auto' }}>
                <Table size="small" sx={{ '& td, & th': { py: 0.5, px: 1 } }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600, width: 200, fontSize: 12 }}>Test</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 120, fontSize: 12 }}>Normal Range</TableCell>
                      {dates.map((d, di) => (
                        <TableCell key={di} sx={{ fontWeight: 600, minWidth: 140, fontSize: 12 }} align="center">
                          {d}
                        </TableCell>
                      ))}
                      <TableCell sx={{ fontWeight: 600, width: 80, fontSize: 12 }}>Unit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {panel.subTests.map((sub, subIdx) => (
                      <TableRow
                        key={sub.name}
                        sx={{
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontSize={12}>{sub.name}</Typography>
                        </TableCell>
                        <TableCell>
                          {sub.normalRange ? (
                            <Typography variant="caption" color="text.secondary">
                              {sub.normalRange.min} – {sub.normalRange.max}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        {dates.map((_, dateIdx) => {
                          const val = sub.values[dateIdx] || '';
                          const oor = isOutOfRange(val, sub.normalRange);
                          return (
                            <TableCell key={dateIdx} align="center">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {getArrow(sub.values, dateIdx)}
                                <TextField
                                  size="small"
                                  value={val}
                                  onChange={(e) => handleValueChange(realIdx, subIdx, dateIdx, e.target.value)}
                                  sx={{
                                    width: 90,
                                    '& .MuiOutlinedInput-root': {
                                      fontSize: 12,
                                      ...(oor && {
                                        '& fieldset': { borderColor: 'error.main' },
                                        bgcolor: (theme) => alpha(theme.palette.error.main, 0.05),
                                      }),
                                    },
                                  }}
                                  slotProps={{ htmlInput: { style: { textAlign: 'center', padding: '4px 8px' } } }}
                                />
                                {oor && (
                                  <Tooltip title="Out of range">
                                    <WarningAmberIcon sx={{ fontSize: 14, color: 'error.main' }} />
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          {(() => {
                            const unitOpts = getUnitOptions(sub.name);
                            if (unitOpts.length > 0) {
                              return (
                                <TextField
                                  select
                                  size="small"
                                  value={sub.units[0] || sub.defaultUnit}
                                  onChange={(e) => handleUnitChange(realIdx, subIdx, 0, e.target.value)}
                                  sx={{ width: 80, '& .MuiOutlinedInput-root': { fontSize: 11 } }}
                                  slotProps={{ htmlInput: { style: { padding: '4px 6px' } } }}
                                >
                                  {sub.defaultUnit && !unitOpts.includes(sub.defaultUnit) && (
                                    <MenuItem value={sub.defaultUnit} sx={{ fontSize: 11 }}>{sub.defaultUnit}</MenuItem>
                                  )}
                                  {unitOpts.map(u => (
                                    <MenuItem key={u} value={u} sx={{ fontSize: 11 }}>{u}</MenuItem>
                                  ))}
                                </TextField>
                              );
                            }
                            return (
                              <Typography variant="caption" color="text.secondary">
                                {sub.defaultUnit || '—'}
                              </Typography>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
          );
        })}

        {filteredPanels.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No panels match your search</Typography>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{
        px: 2.5, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center',
        borderTop: '1px solid', borderColor: 'divider',
        bgcolor: (theme) => alpha(theme.palette.grey[100], 0.5),
        flexShrink: 0,
      }}>
        <Typography variant="caption" color="text.secondary">
          {filledLabs} values entered{outOfRange > 0 ? `, ${outOfRange} out of range` : ''}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" size="small" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={filledLabs === 0}
        >
          Save {filledLabs > 0 ? `(${filledLabs})` : ''}
        </Button>
      </Box>
    </Drawer>
  );
}
