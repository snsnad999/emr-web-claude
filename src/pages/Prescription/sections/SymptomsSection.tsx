import { useState, useCallback } from 'react';
import {
  Box, TextField, Button, Autocomplete, Chip, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, MenuItem,
  Paper, List, ListItemButton, ListItemText, CircularProgress, Divider, Typography,
} from '@mui/material';
import SickIcon from '@mui/icons-material/Sick';
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
import type { Symptom } from '@/types';

const FALLBACK_SEVERITY = ['mild', 'moderate', 'severe'];
const FALLBACK_LATERALITY = ['left', 'right', 'bilateral'];

export default function SymptomsSection() {
  const {
    symptoms, addSymptom, removeSymptom, updateSymptom, reorderSymptoms,
    dropdownOptions, getTemplatesByType, addTemplate, updateTemplate, deleteTemplate, applyTemplate,
  } = usePrescription();
  const severityOptions = dropdownOptions?.symptoms?.severity;
  const lateralityOptions = dropdownOptions?.symptoms?.laterality;
  const [searchTerm, setSearchTerm] = useState('');
  const [showFrequent, setShowFrequent] = useState(false);

  const { items: frequentSymptoms, isLoading: loadingFrequent, fetchIfNeeded } = useFrequentlyUsed('symptoms');

  const { data: masterSymptoms } = useQuery({
    queryKey: ['masters', 'symptoms', searchTerm],
    queryFn: () => mastersApi.getSymptoms(searchTerm),
    enabled: searchTerm.length >= 2,
    staleTime: 60_000,
  });

  const symptomOptions = masterSymptoms?.data?.map(s => s.name) || [];

  const isAlreadyAdded = (name: string): boolean =>
    symptoms.some(s => s.name.toLowerCase() === name.toLowerCase());

  const handleAdd = (name: string) => {
    if (!name.trim()) return;
    if (isAlreadyAdded(name.trim())) {
      toast.error(`"${name.trim()}" is already added`);
      return;
    }
    const newSymptom: Symptom = { name: name.trim(), severity: 'moderate' };
    addSymptom(newSymptom);
    setSearchTerm('');
    setShowFrequent(false);
  };

  const handleAddFromFrequent = (item: Record<string, unknown>) => {
    const name = (item.name as string) || '';
    if (isAlreadyAdded(name)) {
      toast.error(`"${name}" is already added`);
      return;
    }
    addSymptom({ name, severity: 'moderate' });
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
    const items = Array.from(symptoms);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    reorderSymptoms(items);
  }, [symptoms, reorderSymptoms]);

  const symptomTemplates = getTemplatesByType('symptom').map(t => ({
    templateId: t.templateId,
    name: t.name,
  }));

  const handleSaveTemplate = (name: string) => {
    addTemplate(
      name,
      'symptom',
      symptoms.map(s => ({ name: s.name, severity: s.severity, duration: s.duration, laterality: s.laterality })),
    );
  };

  const showFrequentDropdown = showFrequent && !searchTerm && frequentSymptoms.length > 0;

  return (
    <SectionHeader
      id="symptoms"
      title="Chief Complaints / Symptoms"
      icon={<SickIcon />}
      itemCount={symptoms.length}
      templateType="symptom"
      templates={symptomTemplates}
      onSaveTemplate={handleSaveTemplate}
      onUpdateTemplate={(id, name) => updateTemplate(id, name, 'symptom', symptoms.map(s => ({
        name: s.name, severity: s.severity, duration: s.duration, laterality: s.laterality,
      })))}
      onApplyTemplate={(id) => applyTemplate(id, 'symptom')}
      onDeleteTemplate={(id) => deleteTemplate(id, 'symptom')}
    >
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Box sx={{ flex: 1, position: 'relative' }}>
          <Autocomplete
            freeSolo
            options={symptomOptions}
            inputValue={searchTerm}
            onInputChange={(_, val) => {
              setSearchTerm(val);
              if (val) setShowFrequent(false);
              else setShowFrequent(true);
            }}
            onChange={(_, val) => {
              if (val) handleAdd(val);
              setShowFrequent(false);
            }}
            onFocus={handleInputFocus}
            onBlur={() => setTimeout(() => setShowFrequent(false), 200)}
            renderInput={(params) => (
              <TextField {...params} placeholder="Search symptoms..." size="small" />
            )}
            size="small"
          />
          {showFrequentDropdown && (
            <Paper
              elevation={8}
              sx={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                maxHeight: 260, overflow: 'auto', mt: 0.5, border: '1px solid', borderColor: 'divider',
              }}
            >
              <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'grey.50' }}>
                <WhatshotIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                <Typography variant="caption" fontWeight={600} color="text.secondary">Top Used Symptoms</Typography>
                {loadingFrequent && <CircularProgress size={12} sx={{ ml: 'auto' }} />}
              </Box>
              <Divider />
              <List dense disablePadding>
                {frequentSymptoms.map((item, idx) => {
                  const name = (item.name as string) || '';
                  const already = isAlreadyAdded(name);
                  return (
                    <ListItemButton key={idx} disabled={already} onClick={() => handleAddFromFrequent(item)} sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={name}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500, color: already ? 'text.disabled' : 'text.primary' }}
                      />
                      {already && <Chip label="Added" size="small" sx={{ height: 20, fontSize: 10 }} />}
                    </ListItemButton>
                  );
                })}
              </List>
            </Paper>
          )}
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => handleAdd(searchTerm)}
          disabled={!searchTerm.trim()}
        >
          Add
        </Button>
      </Box>

      {symptoms.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40, p: 0.5 }} />
              <TableCell>Symptom</TableCell>
              <TableCell sx={{ width: 130 }}>Severity</TableCell>
              <TableCell sx={{ width: 120 }}>Duration</TableCell>
              <TableCell sx={{ width: 130 }}>Laterality</TableCell>
              <TableCell sx={{ width: 50 }} />
            </TableRow>
          </TableHead>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="symptoms">
              {(provided) => (
                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                  {symptoms.map((s, i) => (
                    <Draggable key={`symptom-${i}`} draggableId={`symptom-${i}`} index={i}>
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
                          <TableCell>
                            <Chip label={s.name} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <TextField
                              select
                              value={s.severity || 'moderate'}
                              onChange={e => {
                                const val = e.target.value;
                                const matched = severityOptions?.find(o => o.option_value === val);
                                updateSymptom(i, { ...s, severity: val as Symptom['severity'], severity_id: matched?.dropdown_option_id });
                              }}
                              size="small"
                              fullWidth
                            >
                              {severityOptions && severityOptions.length > 0
                                ? severityOptions.map(opt => (
                                    <MenuItem key={opt.dropdown_option_id} value={opt.option_value}>{opt.option_value}</MenuItem>
                                  ))
                                : FALLBACK_SEVERITY.map(opt => (
                                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                  ))}
                            </TextField>
                          </TableCell>
                          <TableCell>
                            <TextField
                              value={s.duration || ''}
                              onChange={e => updateSymptom(i, { ...s, duration: e.target.value })}
                              placeholder="e.g. 3 days"
                              size="small"
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              select
                              value={s.laterality || ''}
                              onChange={e => {
                                const val = e.target.value;
                                const matched = lateralityOptions?.find(o => o.option_value === val);
                                updateSymptom(i, { ...s, laterality: val as Symptom['laterality'], laterality_id: matched?.dropdown_option_id });
                              }}
                              size="small"
                              fullWidth
                            >
                              <MenuItem value="">N/A</MenuItem>
                              {lateralityOptions && lateralityOptions.length > 0
                                ? lateralityOptions.map(opt => (
                                    <MenuItem key={opt.dropdown_option_id} value={opt.option_value}>{opt.option_value}</MenuItem>
                                  ))
                                : FALLBACK_LATERALITY.map(opt => (
                                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                  ))}
                            </TextField>
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeSymptom(i)}>
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
