import { useState, useCallback, useRef } from 'react';
import {
  Box, TextField, Button, Autocomplete, IconButton, Grid, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, MenuItem, Typography,
  Paper, List, ListItemButton, ListItemText, CircularProgress, Divider,
} from '@mui/material';
import MedicationIcon from '@mui/icons-material/Medication';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import SectionHeader from '../components/SectionHeader';
import { usePrescription } from '../context/PrescriptionContext';
import { mastersApi } from '@/services/api';
import { useFrequentlyUsed } from '@/hooks/useFrequentlyUsed';
import type { Medication } from '@/types';

const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Powder', 'Gel'];
const FALLBACK_FREQUENCIES = ['Once daily', 'Twice daily', 'Thrice daily', 'Four times daily', 'Every 8 hours', 'Every 12 hours', 'As needed', 'At bedtime'];
const FALLBACK_TIMINGS = ['Before meals', 'After meals', 'With meals', 'Empty stomach', 'Morning', 'Evening', 'Bedtime'];
const FALLBACK_DURATIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', '2 months', '3 months', 'Ongoing'];
const FALLBACK_DOSAGES = ['5mg', '10mg', '25mg', '50mg', '100mg', '250mg', '500mg', '1g'];

const emptyMed: Medication = {
  brandName: '', genericName: '', form: 'Tablet', dosage: '', frequency: 'Twice daily',
  timing: 'After meals', duration: '7 days', qty: 0, instructions: '',
};

export default function MedicationSection() {
  const {
    medications, addMedication, removeMedication, reorderMedications,
    dropdownOptions, getTemplatesByType, addTemplate, updateTemplate, deleteTemplate, applyTemplate,
  } = usePrescription();
  const ddMed = dropdownOptions?.medication;
  const [searchTerm, setSearchTerm] = useState('');
  const [newMed, setNewMed] = useState<Medication>({ ...emptyMed });
  const [showFrequent, setShowFrequent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { items: frequentMeds, isLoading: loadingFrequent, fetchIfNeeded } = useFrequentlyUsed('medications');

  const { data: masterMeds } = useQuery({
    queryKey: ['masters', 'medications', searchTerm],
    queryFn: () => mastersApi.getMedications(searchTerm),
    enabled: searchTerm.length >= 2,
    staleTime: 60_000,
  });

  const medOptions = masterMeds?.data?.map(m => ({
    label: `${m.brandName} (${m.genericName}) — ${m.form} ${m.strength}`,
    brandName: m.brandName,
    genericName: m.genericName,
    form: m.form,
    strength: m.strength,
  })) || [];

  const isMedicationAlreadyAdded = (brandName: string): boolean =>
    medications.some(m => m.brandName.toLowerCase() === brandName.toLowerCase());

  const handleSelect = (opt: typeof medOptions[0] | null) => {
    if (opt) {
      setNewMed(prev => ({
        ...prev,
        brandName: opt.brandName,
        genericName: opt.genericName,
        form: opt.form || prev.form,
        dosage: opt.strength || prev.dosage,
      }));
    }
  };

  const handleAdd = () => {
    if (!newMed.brandName.trim()) return;
    if (isMedicationAlreadyAdded(newMed.brandName)) {
      toast.error(`"${newMed.brandName}" is already added`);
      return;
    }
    addMedication({ ...newMed });
    setNewMed({ ...emptyMed });
    setSearchTerm('');
  };

  const handleAddFromFrequent = (item: Record<string, unknown>) => {
    const brandName = (item.brandName as string) || '';
    if (isMedicationAlreadyAdded(brandName)) {
      toast.error(`"${brandName}" is already added`);
      return;
    }
    addMedication({
      brandName,
      genericName: (item.genericName as string) || '',
      form: (item.form as string) || 'Tablet',
      dosage: (item.dosage as string) || '',
      frequency: (item.frequency as string) || 'Twice daily',
      timing: (item.timing as string) || 'After meals',
      duration: (item.duration as string) || '7 days',
      qty: 0,
      instructions: '',
    });
    setShowFrequent(false);
  };

  const handleInputFocus = () => {
    if (!searchTerm) {
      fetchIfNeeded();
      setShowFrequent(true);
    }
  };

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(medications);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    reorderMedications(items);
  }, [medications, reorderMedications]);

  const medicationTemplates = getTemplatesByType('medication').map(t => ({
    templateId: t.templateId,
    name: t.name,
  }));

  const handleSaveTemplate = (name: string) => {
    addTemplate(
      name,
      'medication',
      medications.map(m => ({
        brandName: m.brandName, genericName: m.genericName, form: m.form,
        dosage: m.dosage, frequency: m.frequency, timing: m.timing, duration: m.duration,
      })),
    );
  };

  // Show frequent dropdown when input focused + empty, hide when typing
  const showFrequentDropdown = showFrequent && !searchTerm && frequentMeds.length > 0;

  return (
    <SectionHeader
      id="medications"
      title="Medications"
      icon={<MedicationIcon />}
      itemCount={medications.length}
      templateType="medication"
      templates={medicationTemplates}
      onSaveTemplate={handleSaveTemplate}
      onUpdateTemplate={(id, name) => updateTemplate(id, name, 'medication', medications.map(m => ({
        brandName: m.brandName, genericName: m.genericName, form: m.form,
        dosage: m.dosage, frequency: m.frequency, timing: m.timing, duration: m.duration,
      })))}
      onApplyTemplate={(id) => applyTemplate(id, 'medication')}
      onDeleteTemplate={(id) => deleteTemplate(id, 'medication')}
    >
      <Box sx={{ mb: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Add Medication</Typography>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ position: 'relative' }}>
              <Autocomplete
                freeSolo
                options={medOptions}
                getOptionLabel={opt => typeof opt === 'string' ? opt : opt.label}
                inputValue={searchTerm}
                onInputChange={(_, val) => {
                  setSearchTerm(val);
                  if (val) setShowFrequent(false);
                  else setShowFrequent(true);
                  if (!medOptions.length) setNewMed(prev => ({ ...prev, brandName: val }));
                }}
                onChange={(_, val) => {
                  if (typeof val === 'string') setNewMed(prev => ({ ...prev, brandName: val }));
                  else handleSelect(val);
                  setShowFrequent(false);
                }}
                onFocus={handleInputFocus}
                onBlur={() => setTimeout(() => setShowFrequent(false), 200)}
                renderInput={params => (
                  <TextField {...params} label="Drug Name" size="small" inputRef={inputRef} />
                )}
                size="small"
              />
              {/* Frequently used dropdown */}
              {showFrequentDropdown && (
                <Paper
                  elevation={8}
                  sx={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                    maxHeight: 280, overflow: 'auto', mt: 0.5, border: '1px solid', borderColor: 'divider',
                  }}
                >
                  <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'grey.50' }}>
                    <WhatshotIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                      Top Used Medications
                    </Typography>
                    {loadingFrequent && <CircularProgress size={12} sx={{ ml: 'auto' }} />}
                  </Box>
                  <Divider />
                  <List dense disablePadding>
                    {frequentMeds.map((item, idx) => {
                      const bn = (item.brandName as string) || '';
                      const gn = (item.genericName as string) || '';
                      const already = isMedicationAlreadyAdded(bn);
                      return (
                        <ListItemButton
                          key={idx}
                          disabled={already}
                          onClick={() => handleAddFromFrequent(item)}
                          sx={{ py: 0.5 }}
                        >
                          <ListItemText
                            primary={bn}
                            secondary={gn || undefined}
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500, color: already ? 'text.disabled' : 'text.primary' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                          {already && <Chip label="Added" size="small" sx={{ height: 20, fontSize: 10 }} />}
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Paper>
              )}
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField label="Generic Name" value={newMed.genericName} onChange={e => setNewMed(p => ({ ...p, genericName: e.target.value }))} size="small" fullWidth />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField select label="Form" value={newMed.form} onChange={e => setNewMed(p => ({ ...p, form: e.target.value }))} size="small" fullWidth>
              {FORMS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <Autocomplete
              freeSolo
              options={ddMed?.dosage?.length ? ddMed.dosage.map(o => o.option_value) : FALLBACK_DOSAGES}
              value={newMed.dosage || ''}
              onInputChange={(_, val) => {
                const matched = ddMed?.dosage?.find(o => o.option_value === val);
                setNewMed(p => ({ ...p, dosage: val, dosage_id: matched?.dropdown_option_id }));
              }}
              onChange={(_, val) => {
                const v = val || '';
                const matched = ddMed?.dosage?.find(o => o.option_value === v);
                setNewMed(p => ({ ...p, dosage: v, dosage_id: matched?.dropdown_option_id }));
              }}
              renderInput={params => <TextField {...params} label="Dosage" size="small" placeholder="e.g. 500mg" />}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.5 }}>
            <TextField select label="Frequency" value={newMed.frequency || ''} onChange={e => {
              const val = e.target.value;
              const matched = ddMed?.frequency?.find(o => o.option_value === val);
              setNewMed(p => ({ ...p, frequency: val, frequency_id: matched?.dropdown_option_id }));
            }} size="small" fullWidth>
              {ddMed?.frequency && ddMed.frequency.length > 0
                ? ddMed.frequency.map(o => <MenuItem key={o.dropdown_option_id} value={o.option_value}>{o.option_value}</MenuItem>)
                : FALLBACK_FREQUENCIES.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField select label="Timing" value={newMed.timing || ''} onChange={e => {
              const val = e.target.value;
              const matched = ddMed?.timing?.find(o => o.option_value === val);
              setNewMed(p => ({ ...p, timing: val, timing_id: matched?.dropdown_option_id }));
            }} size="small" fullWidth>
              {ddMed?.timing && ddMed.timing.length > 0
                ? ddMed.timing.map(o => <MenuItem key={o.dropdown_option_id} value={o.option_value}>{o.option_value}</MenuItem>)
                : FALLBACK_TIMINGS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField select label="Duration" value={newMed.duration || ''} onChange={e => {
              const val = e.target.value;
              const matched = ddMed?.duration?.find(o => o.option_value === val);
              setNewMed(p => ({ ...p, duration: val, duration_id: matched?.dropdown_option_id }));
            }} size="small" fullWidth>
              {ddMed?.duration && ddMed.duration.length > 0
                ? ddMed.duration.map(o => <MenuItem key={o.dropdown_option_id} value={o.option_value}>{o.option_value}</MenuItem>)
                : FALLBACK_DURATIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4, sm: 1.5 }}>
            <TextField label="Qty" type="number" value={newMed.qty || ''} onChange={e => setNewMed(p => ({ ...p, qty: Number(e.target.value) }))} size="small" fullWidth />
          </Grid>
          <Grid size={{ xs: 8, sm: 2 }}>
            <Button variant="contained" fullWidth onClick={handleAdd} disabled={!newMed.brandName.trim()} startIcon={<AddIcon />} sx={{ height: 40 }}>
              Add
            </Button>
          </Grid>
        </Grid>
      </Box>

      {medications.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40, p: 0.5 }} />
              <TableCell>#</TableCell>
              <TableCell>Drug</TableCell>
              <TableCell>Form</TableCell>
              <TableCell>Dosage</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Timing</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell sx={{ width: 50 }} />
            </TableRow>
          </TableHead>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="medications">
              {(provided) => (
                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                  {medications.map((m, i) => (
                    <Draggable key={`med-${i}`} draggableId={`med-${i}`} index={i}>
                      {(dragProvided, snapshot) => (
                        <TableRow
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          sx={{
                            ...(snapshot.isDragging && {
                              display: 'table',
                              bgcolor: 'action.hover',
                              boxShadow: 4,
                            }),
                          }}
                        >
                          <TableCell sx={{ width: 40, p: 0.5 }}>
                            <Box
                              {...dragProvided.dragHandleProps}
                              sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', color: 'text.disabled', '&:hover': { color: 'primary.main' } }}
                            >
                              <DragIndicatorIcon fontSize="small" />
                            </Box>
                          </TableCell>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{m.brandName}</Typography>
                            {m.genericName && <Typography variant="caption" color="text.secondary">{m.genericName}</Typography>}
                          </TableCell>
                          <TableCell><Chip label={m.form} size="small" variant="outlined" /></TableCell>
                          <TableCell>{m.dosage}</TableCell>
                          <TableCell>{m.frequency}</TableCell>
                          <TableCell>{m.timing}</TableCell>
                          <TableCell>{m.duration}</TableCell>
                          <TableCell>{m.qty || '-'}</TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeMedication(i)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </TableBody>
              )}
            </Droppable>
          </DragDropContext>
        </Table>
      )}
    </SectionHeader>
  );
}
