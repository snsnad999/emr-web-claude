import { useState, useCallback } from 'react';
import {
  Box, TextField, Button, Autocomplete, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody,
  Paper, List, ListItemButton, ListItemText, CircularProgress, Divider, Typography, Chip,
} from '@mui/material';
import BiotechIcon from '@mui/icons-material/Biotech';
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

export default function ExaminationSection() {
  const {
    examinationFindings, addExaminationFinding, removeExaminationFinding, reorderExaminationFindings,
    getTemplatesByType, addTemplate, updateTemplate, deleteTemplate, applyTemplate,
  } = usePrescription();
  const [searchTerm, setSearchTerm] = useState('');
  const [notes, setNotes] = useState('');
  const [showFrequent, setShowFrequent] = useState(false);

  const { items: frequentFindings, isLoading: loadingFrequent, fetchIfNeeded } = useFrequentlyUsed('examination_findings');

  const { data: masterFindings } = useQuery({
    queryKey: ['masters', 'examination-findings', searchTerm],
    queryFn: () => mastersApi.getExaminationFindings(searchTerm),
    enabled: searchTerm.length >= 2,
    staleTime: 60_000,
  });

  const options = masterFindings?.data?.map(f => f.name) || [];

  const isAlreadyAdded = (name: string): boolean =>
    examinationFindings.some(f => f.name.toLowerCase() === name.toLowerCase());

  const handleAdd = (name: string) => {
    if (!name.trim()) return;
    if (isAlreadyAdded(name.trim())) {
      toast.error(`"${name.trim()}" is already added`);
      return;
    }
    addExaminationFinding({ name: name.trim(), notes: notes.trim() || undefined });
    setSearchTerm('');
    setNotes('');
    setShowFrequent(false);
  };

  const handleAddFromFrequent = (item: Record<string, unknown>) => {
    const name = (item.name as string) || '';
    if (isAlreadyAdded(name)) {
      toast.error(`"${name}" is already added`);
      return;
    }
    addExaminationFinding({ name, notes: (item.notes as string) || undefined });
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
    const items = Array.from(examinationFindings);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    reorderExaminationFindings(items);
  }, [examinationFindings, reorderExaminationFindings]);

  const examinationTemplates = getTemplatesByType('examination').map(t => ({
    templateId: t.templateId,
    name: t.name,
  }));

  const handleSaveTemplate = (name: string) => {
    addTemplate(
      name,
      'examination',
      examinationFindings.map(f => ({ name: f.name, notes: f.notes })),
    );
  };

  const showFrequentDropdown = showFrequent && !searchTerm && frequentFindings.length > 0;

  return (
    <SectionHeader
      id="examination"
      title="Examination Findings"
      icon={<BiotechIcon />}
      itemCount={examinationFindings.length}
      templateType="examination"
      templates={examinationTemplates}
      onSaveTemplate={handleSaveTemplate}
      onUpdateTemplate={(id, name) => updateTemplate(id, name, 'examination', examinationFindings.map(f => ({
        name: f.name, notes: f.notes,
      })))}
      onApplyTemplate={(id) => applyTemplate(id, 'examination')}
      onDeleteTemplate={(id) => deleteTemplate(id, 'examination')}
    >
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Box sx={{ flex: 1, position: 'relative' }}>
          <Autocomplete
            freeSolo options={options} inputValue={searchTerm}
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
            renderInput={params => <TextField {...params} placeholder="Search findings..." size="small" />}
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
                <Typography variant="caption" fontWeight={600} color="text.secondary">Top Used Findings</Typography>
                {loadingFrequent && <CircularProgress size={12} sx={{ ml: 'auto' }} />}
              </Box>
              <Divider />
              <List dense disablePadding>
                {frequentFindings.map((item, idx) => {
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
        <TextField placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} size="small" sx={{ width: 200 }} />
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => handleAdd(searchTerm)}>Add</Button>
      </Box>

      {examinationFindings.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40, p: 0.5 }} />
              <TableCell>Finding</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell sx={{ width: 50 }} />
            </TableRow>
          </TableHead>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="examinationFindings">
              {(provided) => (
                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                  {examinationFindings.map((f, i) => (
                    <Draggable key={`exam-${i}`} draggableId={`exam-${i}`} index={i}>
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
                          <TableCell>{f.name}</TableCell>
                          <TableCell>{f.notes || '-'}</TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeExaminationFinding(i)}>
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
