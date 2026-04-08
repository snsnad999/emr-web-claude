import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Grid, TextField, Typography, InputAdornment, Chip, Paper, Box,
  IconButton, Tooltip, Select, MenuItem, Collapse,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import HeightIcon from '@mui/icons-material/Height';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import AirIcon from '@mui/icons-material/Air';
import SpeedIcon from '@mui/icons-material/Speed';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ScaleIcon from '@mui/icons-material/Scale';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SectionHeader from '../components/SectionHeader';
import { usePrescription } from '../context/PrescriptionContext';
import type { VitalField, Vitals } from '@/types';

interface VitalCardItem {
  key: string;
  name: string;
  icon: React.ReactNode;
  unitType: string;
  bgColor: string;
  iconColor: string;
  isCircumference?: boolean;
}

const VITAL_CARDS: VitalCardItem[] = [
  { key: 'pulse', name: 'Pulse', icon: <FavoriteIcon fontSize="small" />, unitType: 'pulse', bgColor: '#fef2f2', iconColor: '#ef4444' },
  { key: 'bp', name: 'Blood Pressure', icon: <SpeedIcon fontSize="small" />, unitType: 'blood_pressure', bgColor: '#fef2f2', iconColor: '#dc2626' },
  { key: 'rr', name: 'Respiratory Rate', icon: <AirIcon fontSize="small" />, unitType: 'respiratory_rate', bgColor: '#eff6ff', iconColor: '#3b82f6' },
  { key: 'temp', name: 'Temperature', icon: <ThermostatIcon fontSize="small" />, unitType: 'temperature', bgColor: '#fff7ed', iconColor: '#f97316' },
  { key: 'height', name: 'Height', icon: <HeightIcon fontSize="small" />, unitType: 'height', bgColor: '#f0fdfa', iconColor: '#0d9488' },
  { key: 'weight', name: 'Weight', icon: <ScaleIcon fontSize="small" />, unitType: 'muscle_mass', bgColor: '#faf5ff', iconColor: '#a855f7' },
  { key: 'spo2', name: 'SpO2', icon: <WaterDropIcon fontSize="small" />, unitType: '', bgColor: '#ecfeff', iconColor: '#06b6d4' },
  { key: 'heartRate', name: 'Heart Rate', icon: <FavoriteIcon fontSize="small" />, unitType: '', bgColor: '#fef2f2', iconColor: '#ef4444' },
  { key: 'muscleMass', name: 'Muscle Mass', icon: <FitnessCenterIcon fontSize="small" />, unitType: 'muscle_mass', bgColor: '#faf5ff', iconColor: '#a855f7' },
  { key: 'headCircumference', name: 'Head Circumference', icon: <ChildCareIcon fontSize="small" />, unitType: 'head_circumference', bgColor: '#ecfeff', iconColor: '#06b6d4', isCircumference: true },
  { key: 'chestCircumference', name: 'Chest Circumference', icon: <ChildCareIcon fontSize="small" />, unitType: 'chest_circumference', bgColor: '#fffbeb', iconColor: '#f59e0b', isCircumference: true },
  { key: 'midArmCircumference', name: 'Mid-Arm Circumference', icon: <ChildCareIcon fontSize="small" />, unitType: 'mid_arm_circumference', bgColor: '#ecfdf5', iconColor: '#10b981', isCircumference: true },
  { key: 'waistCircumference', name: 'Waist Circumference', icon: <ChildCareIcon fontSize="small" />, unitType: 'waist_circumference', bgColor: '#eef2ff', iconColor: '#6366f1', isCircumference: true },
];

const SIMPLE_KEYS = new Set(['spo2', 'heartRate', 'rr']);
const DECIMAL_RE = /^\d*\.?\d*$/;

function getVitalValue(vitals: Vitals, key: string): string {
  const v = vitals[key as keyof Vitals];
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && 'value' in v) return (v as VitalField).value || '';
  return '';
}

function getVitalUnit(vitals: Vitals, key: string): string {
  const v = vitals[key as keyof Vitals];
  if (!v || typeof v === 'string') return '';
  if (typeof v === 'object' && 'unit' in v) return (v as VitalField).unit || '';
  return '';
}

function isLocked(vitals: Vitals, key: string): boolean {
  const v = vitals[key as keyof Vitals];
  if (!v || typeof v === 'string') return false;
  if (typeof v === 'object' && 'locked' in v) return !!(v as VitalField).locked;
  return false;
}

function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'warning' as const };
  if (bmi < 25) return { label: 'Normal', color: 'success' as const };
  if (bmi < 30) return { label: 'Overweight', color: 'warning' as const };
  return { label: 'Obese', color: 'error' as const };
}

const INPUT_HEIGHT = 34;
const CARD_MIN_HEIGHT = 90;
const inputBaseSx = (locked: boolean) => ({
  height: INPUT_HEIGHT,
  fontSize: 13,
  bgcolor: locked ? '#f3f4f6' : '#fff',
  color: locked ? '#6b7280' : 'inherit',
  '& input': { textAlign: 'right' },
});

const unitSelectSx = (locked: boolean) => ({
  minWidth: 65,
  height: INPUT_HEIGHT,
  fontSize: 11,
  bgcolor: locked ? '#f3f4f6' : '#fff',
  '& .MuiSelect-select': { py: 0.5, px: 1 },
});

export default function VitalsSection() {
  const { vitals, updateVitals, toggleVitalLock, vitalUnits, patientInfo } = usePrescription();
  const [expanded, setExpanded] = useState(true);

  /* Set default units from API on mount */
  useEffect(() => {
    if (!vitalUnits || Object.keys(vitalUnits).length === 0) return;
    const updates: Partial<Vitals> = {};
    for (const card of VITAL_CARDS) {
      if (!card.unitType || card.key === 'bp' || SIMPLE_KEYS.has(card.key)) continue;
      const currentUnit = getVitalUnit(vitals, card.key);
      if (currentUnit) continue;
      const unitList = vitalUnits[card.unitType];
      if (!unitList?.length) continue;
      const defaultUnit = unitList.find(u => u.is_default) || unitList[0];
      const current = vitals[card.key as keyof Vitals];
      const base = (current && typeof current === 'object') ? current : { value: '', locked: false };
      (updates as Record<string, unknown>)[card.key] = { ...base, unit: defaultUnit.unit_name, unit_id: defaultUnit.unit_id };
    }
    if (Object.keys(updates).length > 0) updateVitals(updates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vitalUnits]);

  /* Age check for circumference fields */
  const showCircumference = useMemo(() => {
    if (!patientInfo?.age) return false;
    const age = String(patientInfo.age).toLowerCase();
    if (age.includes('y')) { const y = parseInt(age.replace(/[^0-9]/g, '')); return !isNaN(y) && y < 2; }
    if (age.includes('m')) { const m = parseInt(age.replace(/[^0-9]/g, '')); return !isNaN(m) && m < 24; }
    if (age.includes('d')) { const d = parseInt(age.replace(/[^0-9]/g, '')); return !isNaN(d) && d < 730; }
    const n = parseInt(age); return !isNaN(n) && n < 2;
  }, [patientInfo?.age]);

  /* Handlers */
  const handleChange = useCallback((key: string, value: string) => {
    if (isLocked(vitals, key)) return;
    if (value !== '' && !DECIMAL_RE.test(value)) return;

    if (SIMPLE_KEYS.has(key)) {
      updateVitals({ [key]: value } as Partial<Vitals>);
    } else {
      const existing = vitals[key as keyof Vitals];
      const field = (existing && typeof existing === 'object') ? existing : { value: '', locked: false };
      updateVitals({ [key]: { ...field, value } } as Partial<Vitals>);
    }
  }, [vitals, updateVitals]);

  const handleBpChange = useCallback((field: 'systolic' | 'diastolic', value: string) => {
    if (vitals.bp?.locked) return;
    if (value !== '' && !DECIMAL_RE.test(value)) return;
    updateVitals({
      bp: {
        systolic: vitals.bp?.systolic || '',
        diastolic: vitals.bp?.diastolic || '',
        ...vitals.bp,
        [field]: value,
      },
    });
  }, [vitals.bp, updateVitals]);

  const handleUnitChange = useCallback((key: string, unitName: string) => {
    if (isLocked(vitals, key)) return;
    const card = VITAL_CARDS.find(c => c.key === key);
    if (!card?.unitType) return;
    const unitList = vitalUnits[card.unitType];
    const selected = unitList?.find(u => u.unit_name === unitName);
    if (!selected) return;
    const existing = vitals[key as keyof Vitals];
    const field = (existing && typeof existing === 'object') ? existing : { value: '', locked: false };
    updateVitals({ [key]: { ...field, unit: selected.unit_name, unit_id: selected.unit_id } } as Partial<Vitals>);
  }, [vitals, vitalUnits, updateVitals]);

  /* Derived */
  const bmiValue = parseFloat(vitals.bmi || '');
  const visibleCards = useMemo(
    () => VITAL_CARDS.filter(c => !c.isCircumference || showCircumference),
    [showCircumference],
  );

  return (
    <SectionHeader id="vitals" title="Vitals" icon={<MonitorHeartIcon />}>
      {/* Toolbar: BMI chip + collapse toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {bmiValue > 0 && (
            <Chip
              label={`BMI: ${vitals.bmi} (${getBmiCategory(bmiValue).label})`}
              color={getBmiCategory(bmiValue).color}
              size="small"
              sx={{ fontWeight: 600, fontSize: 12 }}
            />
          )}
          {showCircumference && (
            <Chip label="Under 2 yrs — circumference fields shown" size="small" color="info" variant="outlined" />
          )}
        </Box>
        <Tooltip title={expanded ? 'Collapse vitals' : 'Expand vitals'}>
          <IconButton size="small" onClick={() => setExpanded(prev => !prev)} sx={{ color: '#6b7280' }}>
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Cards grid */}
      <Collapse in={expanded} timeout={300}>
        <Grid container spacing={1.5}>
          {visibleCards.map(card => {
            const locked = card.key === 'bp' ? !!vitals.bp?.locked : isLocked(vitals, card.key);
            const isSimple = SIMPLE_KEYS.has(card.key);
            const isBp = card.key === 'bp';
            const unitList = card.unitType ? (vitalUnits[card.unitType] || []) : [];
            const hasLockFeature = !isSimple;

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={card.key}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    bgcolor: locked ? '#f3f4f6' : card.bgColor,
                    border: '1px solid',
                    borderColor: locked ? '#d1d5db' : '#e5e7eb',
                    position: 'relative',
                    minHeight: CARD_MIN_HEIGHT,
                    transition: 'border-color 0.2s, background-color 0.2s',
                    '&:hover': { borderColor: locked ? '#d1d5db' : card.iconColor + '66' },
                    '&:hover .lock-btn': { opacity: 1 },
                  }}
                >
                  {/* Lock toggle */}
                  {hasLockFeature && (
                    <Tooltip title={locked ? 'Unlock this field' : 'Lock this field'}>
                      <IconButton
                        className="lock-btn"
                        size="small"
                        onClick={() => toggleVitalLock(card.key)}
                        sx={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          opacity: locked ? 1 : 0,
                          transition: 'opacity 0.2s',
                          color: locked ? '#ef4444' : '#9ca3af',
                          p: 0.4,
                        }}
                      >
                        {locked ? <LockIcon sx={{ fontSize: 15 }} /> : <LockOpenIcon sx={{ fontSize: 15 }} />}
                      </IconButton>
                    </Tooltip>
                  )}

                  {/* Label row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                    <Box
                      sx={{
                        color: card.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        bgcolor: card.iconColor + '18',
                      }}
                    >
                      {card.icon}
                    </Box>
                    <Typography variant="caption" fontWeight={600} sx={{ color: '#374151', fontSize: 12, lineHeight: 1.2 }}>
                      {card.name}
                    </Typography>
                  </Box>

                  {/* Input area */}
                  {isBp ? (
                    <BpInput
                      systolic={vitals.bp?.systolic || ''}
                      diastolic={vitals.bp?.diastolic || ''}
                      locked={locked}
                      onChange={handleBpChange}
                    />
                  ) : (
                    <StandardInput
                      cardKey={card.key}
                      value={isSimple ? getVitalValue(vitals, card.key) : getVitalValue(vitals, card.key)}
                      unit={getVitalUnit(vitals, card.key)}
                      locked={locked}
                      isSimple={isSimple}
                      unitList={unitList}
                      onChange={handleChange}
                      onUnitChange={handleUnitChange}
                    />
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Collapse>
    </SectionHeader>
  );
}

interface BpInputProps {
  systolic: string;
  diastolic: string;
  locked: boolean;
  onChange: (field: 'systolic' | 'diastolic', value: string) => void;
}

function BpInput({ systolic, diastolic, locked, onChange }: BpInputProps) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      <TextField
        placeholder="Sys"
        value={systolic}
        onChange={e => onChange('systolic', e.target.value)}
        disabled={locked}
        size="small"
        sx={{ flex: 1, '& .MuiInputBase-root': { ...inputBaseSx(locked), '& input': { textAlign: 'right' } } }}
      />
      <Typography sx={{ color: '#9ca3af', fontWeight: 700, fontSize: 16, lineHeight: 1, userSelect: 'none' }}>/</Typography>
      <TextField
        placeholder="Dia"
        value={diastolic}
        onChange={e => onChange('diastolic', e.target.value)}
        disabled={locked}
        size="small"
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>mmHg</Typography>
              </InputAdornment>
            ),
          },
        }}
        sx={{ flex: 1, '& .MuiInputBase-root': { ...inputBaseSx(locked), '& input': { textAlign: 'right' } } }}
      />
    </Box>
  );
}

interface StandardInputProps {
  cardKey: string;
  value: string;
  unit: string;
  locked: boolean;
  isSimple: boolean;
  unitList: Array<{ unit_id: number; unit_name: string; is_default: boolean }>;
  onChange: (key: string, value: string) => void;
  onUnitChange: (key: string, unitName: string) => void;
}

function StandardInput({ cardKey, value, unit, locked, isSimple, unitList, onChange, onUnitChange }: StandardInputProps) {
  const simpleUnit = cardKey === 'spo2' ? '%' : cardKey === 'heartRate' ? 'bpm' : cardKey === 'rr' ? '/min' : '';

  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      <TextField
        placeholder="--"
        value={value}
        onChange={e => onChange(cardKey, e.target.value)}
        disabled={locked}
        size="small"
        slotProps={isSimple && simpleUnit ? {
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>{simpleUnit}</Typography>
              </InputAdornment>
            ),
          },
        } : undefined}
        sx={{
          flex: 1,
          '& .MuiInputBase-root': inputBaseSx(locked),
        }}
      />
      {!isSimple && unitList.length > 0 && (
        <Select
          value={unit || (unitList.find(u => u.is_default)?.unit_name || '')}
          onChange={(e: SelectChangeEvent) => onUnitChange(cardKey, e.target.value)}
          disabled={locked}
          size="small"
          sx={unitSelectSx(locked)}
        >
          {unitList.map(u => (
            <MenuItem key={u.unit_id} value={u.unit_name} sx={{ fontSize: 12 }}>
              {u.unit_name}
            </MenuItem>
          ))}
        </Select>
      )}
    </Box>
  );
}
