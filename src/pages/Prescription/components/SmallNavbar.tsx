import { useState, useMemo } from 'react';
import {
  Box, Tabs, Tab, Typography, Chip, IconButton, Menu, MenuItem,
  ListItemText, Tooltip, Badge, alpha, TextField, InputAdornment,
} from '@mui/material';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SickIcon from '@mui/icons-material/Sick';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import BiotechIcon from '@mui/icons-material/Biotech';
import MedicationIcon from '@mui/icons-material/Medication';
import ScienceIcon from '@mui/icons-material/Science';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import HealingIcon from '@mui/icons-material/Healing';
import EventIcon from '@mui/icons-material/Event';
import SendIcon from '@mui/icons-material/Send';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import NotesIcon from '@mui/icons-material/Notes';
import AddBoxIcon from '@mui/icons-material/AddBox';
import TuneIcon from '@mui/icons-material/Tune';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import PhoneIcon from '@mui/icons-material/Phone';
import SearchIcon from '@mui/icons-material/Search';
import { usePrescription, type SectionId } from '../context/PrescriptionContext';
import type { PatientInfo, PrescriptionTemplate } from '@/types';

// Define the section metadata with all possible sections
const SECTION_META: Record<string, { label: string; icon: React.ReactElement }> = {
  vitals: { label: 'Vitals', icon: <MonitorHeartIcon fontSize="small" /> },
  symptoms: { label: 'Symptoms', icon: <SickIcon fontSize="small" /> },
  diagnosis: { label: 'Diagnosis', icon: <MedicalInformationIcon fontSize="small" /> },
  examination: { label: 'Examination', icon: <BiotechIcon fontSize="small" /> },
  medications: { label: 'Medications', icon: <MedicationIcon fontSize="small" /> },
  labInvestigations: { label: 'Lab Orders', icon: <ScienceIcon fontSize="small" /> },
  labResults: { label: 'Lab Results', icon: <AssessmentIcon fontSize="small" /> },
  medicalHistory: { label: 'History', icon: <HistoryIcon fontSize="small" /> },
  procedures: { label: 'Procedures', icon: <HealingIcon fontSize="small" /> },
  followUp: { label: 'Follow-Up', icon: <EventIcon fontSize="small" /> },
  referral: { label: 'Referral', icon: <SendIcon fontSize="small" /> },
  advice: { label: 'Advice', icon: <TipsAndUpdatesIcon fontSize="small" /> },
  notes: { label: 'Notes', icon: <NotesIcon fontSize="small" /> },
  customSections: { label: 'Custom', icon: <AddBoxIcon fontSize="small" /> },
};

interface SmallNavbarProps {
  patientName?: string;
  isEditing?: boolean;
  prescriptionId?: string | null;
  patientInfo?: PatientInfo | null;
  mainTemplates?: PrescriptionTemplate[];
  onConfigurePad?: () => void;
  onApplyMainTemplate?: (templateId: string) => void;
  onScrollToSection?: (sectionId: string) => void;
}

export default function SmallNavbar({
  patientName,
  isEditing,
  prescriptionId,
  patientInfo,
  mainTemplates = [],
  onConfigurePad,
  onApplyMainTemplate,
  onScrollToSection,
}: SmallNavbarProps) {
  const { activeSection, setActiveSection, sectionConfig } = usePrescription();
  const [templateAnchor, setTemplateAnchor] = useState<null | HTMLElement>(null);
  const [templateSearch, setTemplateSearch] = useState('');

  const visibleSections = sectionConfig.sectionOrder.filter(
    s => sectionConfig.enabledSections.includes(s)
  );

  // Find the current index safely
  const currentIndex = visibleSections.indexOf(activeSection);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  // Filter templates by search term (client-side)
  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return mainTemplates;
    const q = templateSearch.toLowerCase();
    return mainTemplates.filter(t => t.name.toLowerCase().includes(q));
  }, [mainTemplates, templateSearch]);

  // Handle tab change: update active section + smooth scroll
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    const sectionId = visibleSections[newValue];
    if (sectionId) {
      setActiveSection(sectionId as SectionId);
      onScrollToSection?.(sectionId);
    }
  };

  const handleTemplateClose = () => {
    setTemplateAnchor(null);
    setTemplateSearch('');
  };

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
      }}
    >
      {/* Header row: title + actions */}
      <Box
        sx={{
          px: 2, pt: 1, pb: 0.5,
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" noWrap sx={{ flex: 1 }}>
          {isEditing
            ? `Edit Prescription${prescriptionId ? ` -- ID: ${prescriptionId.slice(0, 8)}` : ''}`
            : `New Prescription${patientName ? ` -- ${patientName}` : ''}`
          }
        </Typography>

        {isEditing && (
          <Chip
            icon={<EditIcon sx={{ fontSize: 14 }} />}
            label="Edit Mode"
            size="small"
            color="warning"
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: 11, height: 24 }}
          />
        )}

        {/* Templates dropdown */}
        <Tooltip title="Apply a saved template">
          <span>
            <Badge
              badgeContent={mainTemplates.length}
              color="primary"
              max={99}
              sx={{
                '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 },
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => setTemplateAnchor(e.currentTarget)}
                disabled={mainTemplates.length === 0}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1 }}
              >
                <DescriptionIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="caption" sx={{ fontWeight: 500, fontSize: 11 }}>
                  Templates
                </Typography>
              </IconButton>
            </Badge>
          </span>
        </Tooltip>
        <Menu
          anchorEl={templateAnchor}
          open={Boolean(templateAnchor)}
          onClose={handleTemplateClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { minWidth: 240, maxHeight: 380 } } }}
        >
          {/* Search filter */}
          {mainTemplates.length > 3 && (
            <Box sx={{ px: 1.5, py: 1 }}>
              <TextField
                size="small"
                placeholder="Search templates..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                fullWidth
                autoFocus
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                    sx: { fontSize: 13 },
                  },
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </Box>
          )}
          {filteredTemplates.length === 0 ? (
            <MenuItem disabled>
              <ListItemText secondary={templateSearch ? 'No matching templates' : 'No templates available'} />
            </MenuItem>
          ) : (
            filteredTemplates.map((tmpl) => (
              <MenuItem
                key={tmpl.templateId}
                onClick={() => {
                  onApplyMainTemplate?.(tmpl.templateId);
                  handleTemplateClose();
                }}
              >
                <ListItemText
                  primary={tmpl.name}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                />
              </MenuItem>
            ))
          )}
        </Menu>

        {/* Configure pad button */}
        <Tooltip title="Configure Your Pad">
          <IconButton
            size="small"
            onClick={onConfigurePad}
            sx={{
              border: '1px solid', borderColor: 'divider', borderRadius: 1,
              '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) },
            }}
          >
            <TuneIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Patient info bar */}
      {patientInfo && (
        <Box
          sx={{
            px: 2, py: 0.75,
            display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {patientInfo.name}
          </Typography>
          {(patientInfo.age || patientInfo.gender) && (
            <Chip
              label={[patientInfo.age, patientInfo.gender].filter(Boolean).join(' | ')}
              size="small"
              variant="outlined"
              color="info"
              sx={{ fontWeight: 500, fontSize: 11, height: 22 }}
            />
          )}
          {patientInfo.phone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {patientInfo.phone}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Section tabs */}
      <Tabs
        value={safeIndex}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 40,
          '& .MuiTab-root': {
            minHeight: 40,
            textTransform: 'none',
            fontSize: 13,
            fontWeight: 500,
            py: 0.5,
          },
        }}
      >
        {visibleSections.map(sec => {
          const meta = SECTION_META[sec] ?? {
            label: sec.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            icon: <DescriptionIcon fontSize="small" />,
          };
          return (
            <Tab
              key={sec}
              icon={meta.icon}
              iconPosition="start"
              label={meta.label}
            />
          );
        })}
      </Tabs>
    </Box>
  );
}

export { SECTION_META };
