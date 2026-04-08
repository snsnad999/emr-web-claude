import { useState, useCallback } from 'react';
import {
  Box, TextField, Button, Autocomplete, IconButton, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, MenuItem,
  Paper, List, ListItemButton, ListItemText, CircularProgress, Divider, Typography,
} from '@mui/material';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
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
import type { Diagnosis, DiagnosisType, DiagnosisStatus } from '@/types';

const TYPE_OPTIONS: DiagnosisType[] = ['Primary', 'Secondary', 'Differential'];
const FALLBACK_STATUS: DiagnosisStatus[] = ['Active', 'Resolved', 'Chronic'];

export default function DiagnosisSection() {
  const {
    diagnoses, addDiagnosis, removeDiagnosis, updateDiagnosis, reorderDiagnoses,
    getTemplatesByType, addTemplate, updateTemplate, deleteTemplate, applyTemplate,
    dropdownOptions,
  } = usePrescription();
  const statusOptions = dropdownOptions?.diagnosis?.status;
  const [searchTerm, setSearchTerm] = useState('');
  const [showFrequent, setShowFrequent] = useState(false);

  const { items: frequentDiagnoses, isLoading: loadingFrequent, fetchIfNeeded } = useFrequentlyUsed('diagnoses');

  const { data: masterDiagnoses } = useQuery({
    queryKey: ['masters', 'diagnoses', searchTerm],
    queryFn: () => mastersApi.getDiagnoses(searchTerm),
    enabled: searchTerm.length >= 2,
    staleTime: 60_000,
  });

  const diagnosisOptions = masterDiagnoses?.data?.map(d => ({
    label: d.description,
    code: d.icdCode,
    description: d.description,
  })) || [];

  const isAlreadyAdded = (desc: string): boolean =>
    diagnoses.some(d => d.description.toLowerCase() === desc.toLowerCase());

  const handleAdd = (option: { code: string; description: string } | null, freeText?: string) => {
    const desc = option?.description || freeText || searchTerm;
    if (!desc.trim()) return;
    if (isAlreadyAdded(desc.trim())) {
      toast.error(`"${desc.trim()}" is already added`);
      return;
    }
    const newDiag: Diagnosis = {
      icdCode: option?.code || '',
      description: desc.trim(),
      type: 'Primary',
      status: 'Active',
    };
    addDiagnosis(newDiag);
    setSearchTerm('');
    setShowFrequent(false);
  };

  const handleAddFromFrequent = (item: Record<string, unknown>) => {
    const desc = (item.description as string) || (item.name as string) || '';
    if (isAlreadyAdded(desc)) {
      toast.error(`"${desc}" is already added`);
      return;
    }
    addDiagnosis({
      icdCode: (item.icdCode as string) || '',
      description: desc,
      type: 'Primary',
      status: (item.status as DiagnosisStatus) || 'Active',
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
    const items = Array.from(diagnoses);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    reorderDiagnoses(items);
  }, [diagnoses, reorderDiagnoses]);

  const diagnosisTemplates = getTemplatesByType('diagnosis').map(t => ({
    templateId: t.templateId,
    name: t.name,
  }));

  const handleSaveTemplate = (name: string) => {
    addTemplate(
      name,
      'diagnosis',
      diagnoses.map(d => ({ icdCode: d.icdCode, description: d.description, type: d.type, status: d.status })),
    );
  };

  const showFrequentDropdown = showFrequent && !searchTerm && frequentDiagnoses.length > 0;

  return (
    <SectionHeader
      id="diagnosis"
      title="Diagnosis"
      icon={<MedicalInformationIcon />}
      itemCount={diagnoses.length}
      templateType="diagnosis"
      templates={diagnosisTemplates}
      onSaveTemplate={handleSaveTemplate}
      onUpdateTemplate={(id, name) => updateTemplate(id, name, 'diagnosis', diagnoses.map(d => ({
        icdCode: d.icdCode, description: d.description, type: d.type, status: d.status,
      })))}
      onApplyTemplate={(id) => applyTemplate(id, 'diagnosis')}
      onDeleteTemplate={(id) => deleteTemplate(id, 'diagnosis')}
    >
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Box sx={{ flex: 1, position: 'relative' }}>
          <Autocomplete
            freeSolo
            options={diagnosisOptions}
            getOptionLabel={opt => typeof opt === 'string' ? opt : opt.label}
            inputValue={searchTerm}
            onInputChange={(_, val) => {
              setSearchTerm(val);
              if (val) setShowFrequent(false);
              else setShowFrequent(true);
            }}
            onChange={(_, val) => {
              if (typeof val === 'string') handleAdd(null, val);
              else if (val) handleAdd(val);
              setShowFrequent(false);
            }}
            onFocus={handleInputFocus}
            onBlur={() => setTimeout(() => setShowFrequent(false), 200)}
            renderInput={params => (
              <TextField {...params} placeholder="Search diagnoses..." size="small" />
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
                <Typography variant="caption" fontWeight={600} color="text.secondary">Top Used Diagnoses</Typography>
                {loadingFrequent && <CircularProgress size={12} sx={{ ml: 'auto' }} />}
              </Box>
              <Divider />
              <List dense disablePadding>
                {frequentDiagnoses.map((item, idx) => {
                  const desc = (item.description as string) || (item.name as string) || '';
                  const already = isAlreadyAdded(desc);
                  return (
                    <ListItemButton key={idx} disabled={already} onClick={() => handleAddFromFrequent(item)} sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={desc}
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
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => handleAdd(null)}>
          Add
        </Button>
      </Box>

      {diagnoses.length > 0 && (
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40, p: 0.5 }} />
              <TableCell>Description</TableCell>
              <TableCell sx={{ width: 160, minWidth: 160 }}>Type</TableCell>
              <TableCell sx={{ width: 160, minWidth: 160 }}>Status</TableCell>
              <TableCell sx={{ width: 180, minWidth: 180 }}>Notes</TableCell>
              <TableCell sx={{ width: 50 }} />
            </TableRow>
          </TableHead>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="diagnoses">
              {(provided) => (
                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                  {diagnoses.map((d, i) => (
                    <Draggable key={`diag-${i}`} draggableId={`diag-${i}`} index={i}>
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
                          <TableCell>{d.description}</TableCell>
                          <TableCell sx={{ minWidth: 160 }}>
                            <TextField
                              select value={d.type} size="small" fullWidth
                              onChange={e => updateDiagnosis(i, { ...d, type: e.target.value as DiagnosisType })}
                            >
                              {TYPE_OPTIONS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                            </TextField>
                          </TableCell>
                          <TableCell sx={{ minWidth: 160 }}>
                            <TextField
                              select value={d.status} size="small" fullWidth
                              onChange={e => updateDiagnosis(i, { ...d, status: e.target.value as DiagnosisStatus })}
                            >
                              {statusOptions && statusOptions.length > 0
                                ? statusOptions.map(s => <MenuItem key={s.dropdown_option_id} value={s.option_value}>{s.option_value}</MenuItem>)
                                : FALLBACK_STATUS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </TextField>
                          </TableCell>
                          <TableCell sx={{ minWidth: 180 }}>
                            <TextField
                              value={d.notes || ''} size="small" fullWidth placeholder="Notes"
                              onChange={e => updateDiagnosis(i, { ...d, notes: e.target.value })}
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeDiagnosis(i)}>
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
