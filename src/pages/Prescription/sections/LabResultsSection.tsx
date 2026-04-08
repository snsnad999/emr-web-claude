import { useState, useCallback } from 'react';
import {
  Box, TextField, Button, IconButton, Chip, Grid, Autocomplete,
  Table, TableHead, TableRow, TableCell, TableBody, MenuItem,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useQuery } from '@tanstack/react-query';
import SectionHeader from '../components/SectionHeader';
import { usePrescription } from '../context/PrescriptionContext';
import { mastersApi } from '@/services/api';
import BrowsePanel from '../components/BrowsePanel';
import type { LabResult } from '@/types';

const FALLBACK_INTERPRETATIONS = ['Normal', 'Abnormal', 'Critical'];

export default function LabResultsSection() {
  const { labResults, addLabResult, removeLabResult, reorderLabResults, dropdownOptions } = usePrescription();
  const interpretationOpts = (dropdownOptions as Record<string, Record<string, { dropdown_option_id: number; option_value: string }[]>> | null)
    ?.labresult?.interpretation;
  const [searchTerm, setSearchTerm] = useState('');
  const [newResult, setNewResult] = useState<LabResult>({
    testName: '', reading: '', unit: '', normalRange: '', interpretation: 'Normal', date: '', notes: '',
  });
  const [browseOpen, setBrowseOpen] = useState(false);

  const { data: masterTests } = useQuery({
    queryKey: ['masters', 'lab-tests', searchTerm],
    queryFn: () => mastersApi.getLabTests(searchTerm),
    enabled: searchTerm.length >= 2,
    staleTime: 60_000,
  });

  const testOptions = masterTests?.data?.map(t => ({
    label: `${t.name} (${t.category})`,
    name: t.name,
    unit: t.unit,
    normalRange: t.normalRange,
  })) || [];

  const handleAdd = () => {
    if (!newResult.testName.trim() || !newResult.reading.trim()) return;
    addLabResult({ ...newResult, date: newResult.date || new Date().toISOString().slice(0, 10) });
    setNewResult({ testName: '', reading: '', unit: '', normalRange: '', interpretation: 'Normal', date: '', notes: '' });
    setSearchTerm('');
  };

  const handleBrowseSave = useCallback((results: LabResult[]) => {
    results.forEach(r => addLabResult(r));
  }, [addLabResult]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(labResults);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    reorderLabResults(items);
  }, [labResults, reorderLabResults]);

  return (
    <SectionHeader id="labResults" title="Lab Results" icon={<AssessmentIcon />} itemCount={labResults.length}>
      <Box sx={{ mb: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Autocomplete
              freeSolo
              options={testOptions}
              getOptionLabel={opt => typeof opt === 'string' ? opt : opt.label}
              inputValue={searchTerm}
              onInputChange={(_, val) => {
                setSearchTerm(val);
                setNewResult(p => ({ ...p, testName: val }));
              }}
              onChange={(_, val) => {
                if (typeof val === 'string') {
                  setNewResult(p => ({ ...p, testName: val }));
                } else if (val) {
                  setNewResult(p => ({ ...p, testName: val.name, unit: val.unit || p.unit, normalRange: val.normalRange || p.normalRange }));
                }
              }}
              renderInput={params => <TextField {...params} label="Test Name" size="small" />}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField label="Reading" value={newResult.reading} onChange={e => setNewResult(p => ({ ...p, reading: e.target.value }))} size="small" fullWidth />
          </Grid>
          <Grid size={{ xs: 6, sm: 1.5 }}>
            <TextField label="Unit" value={newResult.unit} onChange={e => setNewResult(p => ({ ...p, unit: e.target.value }))} size="small" fullWidth />
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField label="Normal Range" value={newResult.normalRange} onChange={e => setNewResult(p => ({ ...p, normalRange: e.target.value }))} size="small" fullWidth />
          </Grid>
          <Grid size={{ xs: 6, sm: 1.5 }}>
            <TextField select label="Interpretation" value={newResult.interpretation} onChange={e => setNewResult(p => ({ ...p, interpretation: e.target.value }))} size="small" fullWidth>
              {interpretationOpts && interpretationOpts.length > 0
                ? interpretationOpts.map(o => <MenuItem key={o.dropdown_option_id} value={o.option_value}>{o.option_value}</MenuItem>)
                : FALLBACK_INTERPRETATIONS.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 1 }}>
            <Button variant="contained" fullWidth onClick={handleAdd} startIcon={<AddIcon />} sx={{ height: 40 }}>Add</Button>
          </Grid>
          <Grid size={{ xs: 6, sm: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setBrowseOpen(true)}
              startIcon={<FolderOpenIcon />}
              sx={{ height: 40, textTransform: 'none' }}
              color="secondary"
            >
              Browse
            </Button>
          </Grid>
        </Grid>
      </Box>

      {labResults.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40, p: 0.5 }} />
              <TableCell>Test</TableCell>
              <TableCell>Reading</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Normal Range</TableCell>
              <TableCell>Interpretation</TableCell>
              <TableCell sx={{ width: 50 }} />
            </TableRow>
          </TableHead>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="labResults">
              {(provided) => (
                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                  {labResults.map((r, i) => (
                    <Draggable key={`labr-${i}`} draggableId={`labr-${i}`} index={i}>
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
                          <TableCell>{r.testName}</TableCell>
                          <TableCell><strong>{r.reading}</strong></TableCell>
                          <TableCell>{r.unit}</TableCell>
                          <TableCell>{r.normalRange}</TableCell>
                          <TableCell>
                            <Chip
                              label={r.interpretation}
                              size="small"
                              color={r.interpretation === 'Normal' ? 'success' : r.interpretation === 'Critical' ? 'error' : 'warning'}
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeLabResult(i)}>
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

      <BrowsePanel
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        onSave={handleBrowseSave}
        dropdownOptions={dropdownOptions as Record<string, Record<string, { dropdown_option_id: number; option_value: string; applies_to?: string[] }[]>> | null}
      />
    </SectionHeader>
  );
}
