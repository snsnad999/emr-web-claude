import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, FormControlLabel, Checkbox,
  Button, IconButton, Tooltip, Drawer, Divider, List, ListItem,
  ListItemText, ListItemSecondaryAction, Collapse,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import SectionHeader from '../components/SectionHeader';
import { usePrescription, type MedicalCondition } from '../context/PrescriptionContext';

// ─── Toggle Pill Sub-component ──────────────────────────────────────
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

// ─── Condition Card Sub-component ───────────────────────────────────
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
        <TogglePill
          label="Y"
          active={condition.value === 'Y'}
          activeColor="#10b981"
          onClick={() => onValueChange(index, 'Y')}
        />
        <TogglePill
          label="-"
          active={condition.value === '-'}
          activeColor="#d1d5db"
          activeFg="#374151"
          onClick={() => onValueChange(index, '-')}
        />
        <TogglePill
          label="N"
          active={condition.value === 'N'}
          activeColor="#ef4444"
          onClick={() => onValueChange(index, 'N')}
        />
      </Box>

      {condition.value === 'Y' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography variant="caption" sx={{ color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap' }}>
            Since
          </Typography>
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

// ─── Configure Drawer Sub-component ─────────────────────────────────
function ConfigureDrawer({ open, onClose, conditions, onSave }: {
  open: boolean;
  onClose: () => void;
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

  const handleRemove = (idx: number) => {
    setTempHistory(tempHistory.filter((_, i) => i !== idx));
  };

  const handleStartEdit = (idx: number) => {
    setEditIndex(idx);
    setEditText(tempHistory[idx].name);
  };

  const handleSaveEdit = () => {
    if (editIndex === null || !editText.trim()) return;
    setTempHistory(
      tempHistory.map((h, i) => (i === editIndex ? { ...h, name: editText.trim() } : h)),
    );
    setEditIndex(null);
    setEditText('');
  };

  const handleSave = () => {
    onSave(tempHistory);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 400 } } }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>Configure Conditions</Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {/* Add new condition */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New condition name..."
            size="small"
            fullWidth
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleAdd}
            disabled={!newName.trim()}
            sx={{ minWidth: 40 }}
          >
            <AddIcon />
          </Button>
        </Box>

        {/* Condition list */}
        <List dense sx={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
          {tempHistory.map((item, idx) => (
            <ListItem key={idx} sx={{ pr: 10 }}>
              {editIndex === idx ? (
                <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                  <TextField
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    size="small"
                    fullWidth
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                    autoFocus
                  />
                  <IconButton size="small" onClick={handleSaveEdit} color="primary">
                    <SaveIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <>
                  <ListItemText
                    primary={item.name}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => handleStartEdit(idx)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleRemove(idx)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </>
              )}
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={onClose} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} sx={{ textTransform: 'none' }}>
            Save Changes
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function MedicalHistorySection() {
  const {
    medicalConditions,
    noRelevantHistory,
    updateMedicalCondition,
    setMedicalConditions,
    setNoRelevantHistory,
  } = usePrescription();

  const [showConfig, setShowConfig] = useState(false);
  const [newCondition, setNewCondition] = useState('');

  const filledCount = medicalConditions.filter((c) => c.value !== '-').length;

  const handleValueChange = (index: number, newValue: 'Y' | 'N' | '-') => {
    updateMedicalCondition(index, {
      ...medicalConditions[index],
      value: newValue,
      since: newValue === 'Y' ? medicalConditions[index].since : '',
    });
  };

  const handleSinceChange = (index: number, since: string) => {
    updateMedicalCondition(index, { ...medicalConditions[index], since });
  };

  const handleAddInline = () => {
    const trimmed = newCondition.trim();
    if (!trimmed) return;
    if (medicalConditions.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return;
    updateMedicalCondition(medicalConditions.length, { name: trimmed, value: '-', since: '' });
    setNewCondition('');
  };

  const handleConfigSave = (conditions: MedicalCondition[]) => {
    setMedicalConditions(conditions);
  };

  return (
    <SectionHeader
      id="medicalHistory"
      title="Patient Medical History"
      icon={<HistoryIcon />}
      itemCount={filledCount}
    >
      {/* Top bar: checkbox + configure */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={noRelevantHistory}
              onChange={(e) => setNoRelevantHistory(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              No known medical history
            </Typography>
          }
        />
        <Tooltip title="Configure conditions">
          <IconButton
            size="small"
            onClick={() => setShowConfig(true)}
            sx={{ color: 'text.secondary' }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Collapsible conditions grid */}
      <Collapse in={!noRelevantHistory}>
        {/* 3-column responsive grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {medicalConditions.map((condition, index) => (
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddInline();
              }
            }}
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

      {/* Configure Drawer */}
      <ConfigureDrawer
        open={showConfig}
        onClose={() => setShowConfig(false)}
        conditions={medicalConditions}
        onSave={handleConfigSave}
      />
    </SectionHeader>
  );
}
