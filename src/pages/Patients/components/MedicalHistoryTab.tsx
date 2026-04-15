import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  IconButton,
  Tooltip,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
  Paper,
  Skeleton,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import {
  Warning as AllergyIcon,
  LocalHospital as SurgeryIcon,
  FamilyRestroom as FamilyIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { patientApi } from '@/services/api';
import type { PatientMedicalHistory } from '@/types';

interface MedicalHistoryTabProps {
  patientId: string;
}

// ─── Types ─────────────────────────────────────────────────────────────
interface MedicalCondition {
  name: string;
  value: 'Y' | 'N' | '-';
  since?: string;
  notes?: string;
}

const DEFAULT_CONDITIONS: MedicalCondition[] = [
  { name: 'Diabetes mellitus', value: '-', since: '' },
  { name: 'Hypertension', value: '-', since: '' },
  { name: 'Hypothyroidism', value: '-', since: '' },
  { name: 'Alcohol', value: '-', since: '' },
  { name: 'Tobacco', value: '-', since: '' },
  { name: 'Tobacco (Chewing)', value: '-', since: '' },
  { name: 'Smoking', value: '-', since: '' },
  { name: 'Dustel 0.5Mg Tablet', value: '-', since: '' },
];

// ─── Toggle Pill Sub-component ─────────────────────────────────────────
function TogglePill({ label, active, activeColor, activeFg, onClick }: {
  label: string; active: boolean; activeColor: string; activeFg?: string; onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontWeight: 600, fontSize: 12,
        bgcolor: active ? activeColor : 'transparent',
        color: active ? (activeFg || '#fff') : '#6b7280',
        transition: 'all 0.15s', userSelect: 'none',
        '&:hover': { opacity: 0.85 },
      }}
    >
      {label}
    </Box>
  );
}

// ─── Condition Card Sub-component ──────────────────────────────────────
function ConditionCard({ condition, index, onValueChange, onSinceChange }: {
  condition: MedicalCondition; index: number;
  onValueChange: (i: number, v: 'Y' | 'N' | '-') => void;
  onSinceChange: (i: number, s: string) => void;
}) {
  const borderColor = condition.value === 'Y' ? '#86efac' : condition.value === 'N' ? '#fca5a5' : 'divider';
  const bgColor = condition.value === 'Y' ? '#f0fdf4' : condition.value === 'N' ? '#fef2f2' : 'background.paper';

  return (
    <Box sx={{ p: 1.5, border: '1px solid', borderColor, borderRadius: 2, bgcolor: bgColor, transition: 'all 0.2s' }}>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#1f2937', fontSize: 13 }}>
        {condition.name}
      </Typography>
      <Box sx={{ display: 'flex', borderRadius: '9999px', bgcolor: '#f3f4f6', overflow: 'hidden', height: 30 }}>
        <TogglePill label="Y" active={condition.value === 'Y'} activeColor="#10b981" onClick={() => onValueChange(index, 'Y')} />
        <TogglePill label="-" active={condition.value === '-'} activeColor="#d1d5db" activeFg="#374151" onClick={() => onValueChange(index, '-')} />
        <TogglePill label="N" active={condition.value === 'N'} activeColor="#ef4444" onClick={() => onValueChange(index, 'N')} />
      </Box>
      {condition.value === 'Y' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography variant="caption" sx={{ color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap' }}>Since</Typography>
          <TextField
            value={condition.since || ''}
            onChange={(e) => onSinceChange(index, e.target.value)}
            size="small"
            placeholder="Year"
            sx={{ '& .MuiInputBase-root': { height: 28, fontSize: 12 } }}
            fullWidth
          />
        </Box>
      )}
    </Box>
  );
}

// ─── Configure Drawer Sub-component ────────────────────────────────────
function ConfigureDrawer({ open, onClose, conditions, onSave }: {
  open: boolean; onClose: () => void;
  conditions: MedicalCondition[];
  onSave: (conditions: MedicalCondition[]) => void;
}) {
  const [tempHistory, setTempHistory] = useState<MedicalCondition[]>([]);
  const [newName, setNewName] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (open) {
      setTempHistory(conditions.map((c) => ({ ...c })));
      setNewName('');
      setEditIndex(null);
      setEditText('');
    }
  }, [open, conditions]);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (tempHistory.some((h) => h.name.toLowerCase() === trimmed.toLowerCase())) return;
    setTempHistory([...tempHistory, { name: trimmed, value: '-', since: '' }]);
    setNewName('');
  };

  const handleRemove = (idx: number) => setTempHistory(tempHistory.filter((_, i) => i !== idx));

  const handleStartEdit = (idx: number) => { setEditIndex(idx); setEditText(tempHistory[idx].name); };

  const handleSaveEdit = () => {
    if (editIndex === null || !editText.trim()) return;
    setTempHistory(tempHistory.map((h, i) => (i === editIndex ? { ...h, name: editText.trim() } : h)));
    setEditIndex(null);
    setEditText('');
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: 400 } } }}>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>Configure Conditions</Typography>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New condition name..."
            size="small"
            fullWidth
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
          <Button variant="contained" size="small" onClick={handleAdd} disabled={!newName.trim()} sx={{ minWidth: 40 }}>
            <AddIcon />
          </Button>
        </Box>
        <List dense sx={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
          {tempHistory.map((item, idx) => (
            <ListItem key={idx} sx={{ pr: 10 }}>
              {editIndex === idx ? (
                <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                  <TextField value={editText} onChange={(e) => setEditText(e.target.value)} size="small" fullWidth
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }} autoFocus />
                  <IconButton size="small" onClick={handleSaveEdit} color="primary"><SaveIcon fontSize="small" /></IconButton>
                </Box>
              ) : (
                <>
                  <ListItemText primary={item.name} primaryTypographyProps={{ variant: 'body2' }} />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => handleStartEdit(idx)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleRemove(idx)}><DeleteIcon fontSize="small" /></IconButton>
                  </ListItemSecondaryAction>
                </>
              )}
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={() => { onSave(tempHistory); onClose(); }} sx={{ textTransform: 'none' }}>Save Changes</Button>
        </Box>
      </Box>
    </Drawer>
  );
}

// ─── Section Header Helper ─────────────────────────────────────────────
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      {icon}
      <Typography variant="h6" fontWeight={600}>{title}</Typography>
    </Box>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
      {text}
    </Typography>
  );
}

function severityColor(severity: string): 'error' | 'warning' | 'default' {
  if (severity === 'Severe' || severity === 'High') return 'error';
  if (severity === 'Moderate' || severity === 'Medium') return 'warning';
  return 'default';
}

// ─── Main Component ────────────────────────────────────────────────────
export default function MedicalHistoryTab({ patientId }: MedicalHistoryTabProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['patientHistory', patientId],
    queryFn: () => patientApi.getPatientHistory(patientId),
  });

  // API returns { data: { patient, medicalHistory, lockedVitals, lastVisitDate } }
  const responseData = data?.data as { medicalHistory?: PatientMedicalHistory } | undefined;
  const raw = responseData?.medicalHistory;
  const isValidHistory = raw != null && typeof raw === 'object' && !Array.isArray(raw);
  const history: PatientMedicalHistory | undefined = isValidHistory
    ? {
        ...raw,
        conditions: Array.isArray(raw.conditions) ? raw.conditions : [],
        allergies: Array.isArray(raw.allergies) ? raw.allergies : [],
        surgicalHistory: Array.isArray(raw.surgicalHistory) ? raw.surgicalHistory : [],
        familyHistory: Array.isArray(raw.familyHistory) ? raw.familyHistory : [],
        noHistory: !!raw.noHistory,
      }
    : undefined;

  // Local state for editable conditions (same as Prescription MedicalHistorySection)
  const [conditions, setConditions] = useState<MedicalCondition[]>(DEFAULT_CONDITIONS);
  const [noRelevantHistory, setNoRelevantHistory] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [newCondition, setNewCondition] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Initialize from API data
  useEffect(() => {
    if (history) {
      setNoRelevantHistory(!!history.noHistory);
      if (history.conditions && history.conditions.length > 0) {
        // Merge: keep defaults, overlay saved values, append any custom ones
        const merged = DEFAULT_CONDITIONS.map(d => {
          const match = history.conditions.find(c => c.name.toLowerCase() === d.name.toLowerCase());
          return match ? { name: match.name, value: (match.value || '-') as 'Y' | 'N' | '-', since: match.since || '', notes: match.notes || '' } : { ...d };
        });
        history.conditions.forEach(c => {
          if (!merged.find(m => m.name.toLowerCase() === c.name.toLowerCase())) {
            merged.push({ name: c.name, value: (c.value || '-') as 'Y' | 'N' | '-', since: c.since || '', notes: c.notes || '' });
          }
        });
        setConditions(merged);
      }
      setIsDirty(false);
    }
  }, [history?.historyId, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => patientApi.savePatientHistory(patientId, payload),
    onSuccess: () => {
      toast.success('Medical history saved');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['patientHistory', patientId] });
    },
    onError: () => {
      toast.error('Failed to save medical history');
    },
  });

  const handleValueChange = useCallback((index: number, newValue: 'Y' | 'N' | '-') => {
    setConditions((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, value: newValue, since: newValue === 'Y' ? c.since : '' } : c,
      ),
    );
    setIsDirty(true);
  }, []);

  const handleSinceChange = useCallback((index: number, since: string) => {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, since } : c)));
    setIsDirty(true);
  }, []);

  const handleAddInline = () => {
    const trimmed = newCondition.trim();
    if (!trimmed) return;
    if (conditions.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return;
    setConditions((prev) => [...prev, { name: trimmed, value: '-', since: '' }]);
    setNewCondition('');
    setIsDirty(true);
  };

  const handleConfigSave = (newConditions: MedicalCondition[]) => {
    setConditions(newConditions);
    setIsDirty(true);
  };

  const handleNoHistoryChange = (checked: boolean) => {
    setNoRelevantHistory(checked);
    setIsDirty(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      conditions,
      noHistory: noRelevantHistory,
    });
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton height={40} sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={80} variant="rounded" />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* ─── Conditions Section (Interactive, matches Prescription) ──── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>Patient Medical History</Typography>
            {conditions.filter((c) => c.value !== '-').length > 0 && (
              <Chip
                label={`${conditions.filter((c) => c.value !== '-').length} recorded`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isDirty && (
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saveMutation.isPending}
                sx={{ textTransform: 'none' }}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            )}
            <Tooltip title="Configure conditions">
              <IconButton size="small" onClick={() => setShowConfig(true)} sx={{ color: 'text.secondary' }}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* No known history checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              checked={noRelevantHistory}
              onChange={(e) => handleNoHistoryChange(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              No known medical history
            </Typography>
          }
          sx={{ mb: 2 }}
        />

        {/* Collapsible conditions grid */}
        <Collapse in={!noRelevantHistory}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {conditions.map((condition, index) => (
              <ConditionCard
                key={`${condition.name}-${index}`}
                condition={condition}
                index={index}
                onValueChange={handleValueChange}
                onSinceChange={handleSinceChange}
              />
            ))}
          </Box>

          {/* Add new condition inline */}
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <TextField
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              placeholder="Enter new condition..."
              size="small"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInline(); } }}
              sx={{ flex: 1, '& .MuiInputBase-root': { height: 36, fontSize: 13 } }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              disabled={!newCondition.trim()}
              onClick={handleAddInline}
              sx={{ textTransform: 'none', height: 36 }}
            >
              Add New Condition
            </Button>
          </Box>
        </Collapse>

        <ConfigureDrawer
          open={showConfig}
          onClose={() => setShowConfig(false)}
          conditions={conditions}
          onSave={handleConfigSave}
        />
      </Paper>

      {/* ─── Other History Sections (Allergies, Surgical, Family) ──── */}
      <Grid container spacing={3}>
        {/* Allergies */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <SectionTitle icon={<AllergyIcon color="error" />} title="Allergies" />
            <Divider sx={{ mb: 1 }} />
            {(history?.allergies?.length ?? 0) > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Allergen</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Reaction</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history!.allergies.map((allergy) => (
                      <TableRow key={allergy.allergen}>
                        <TableCell>{allergy.allergen}</TableCell>
                        <TableCell>
                          <Chip label={allergy.severity} size="small" color={severityColor(allergy.severity)} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{allergy.reaction}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <EmptyMessage text="No allergies recorded" />
            )}
          </Paper>
        </Grid>

        {/* Surgical History */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <SectionTitle icon={<SurgeryIcon color="primary" />} title="Surgical History" />
            <Divider sx={{ mb: 1 }} />
            {(history?.surgicalHistory?.length ?? 0) > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Procedure</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history!.surgicalHistory.map((surgery) => (
                      <TableRow key={`${surgery.procedure}-${surgery.date}`}>
                        <TableCell>{surgery.procedure}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {surgery.date ? format(new Date(surgery.date), 'dd MMM yyyy') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{surgery.notes || '-'}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <EmptyMessage text="No surgical history recorded" />
            )}
          </Paper>
        </Grid>

        {/* Family History */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <SectionTitle icon={<FamilyIcon color="primary" />} title="Family History" />
            <Divider sx={{ mb: 1 }} />
            {(history?.familyHistory?.length ?? 0) > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Relation</TableCell>
                      <TableCell>Condition</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history!.familyHistory.map((entry) => (
                      <TableRow key={`${entry.relation}-${entry.condition}`}>
                        <TableCell>{entry.relation}</TableCell>
                        <TableCell>{entry.condition}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <EmptyMessage text="No family history recorded" />
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
