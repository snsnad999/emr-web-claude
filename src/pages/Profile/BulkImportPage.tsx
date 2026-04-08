import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Breadcrumbs,
  Link,
  Grid,
} from '@mui/material';
import {
  Medication as MedicationIcon,
  LocalHospital as LocalHospitalIcon,
  MonitorHeart as MonitorHeartIcon,
  Biotech as BiotechIcon,
  Science as ScienceIcon,
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import type { BulkImportSection } from '@/types';

const MotionCard = motion.create(Card);

interface SectionCardData {
  key: BulkImportSection;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const SECTIONS: SectionCardData[] = [
  {
    key: 'medication',
    label: 'Medication',
    icon: <MedicationIcon />,
    color: '#0D7C66',
    description: 'Import drug names and generic names',
  },
  {
    key: 'diagnosis',
    label: 'Diagnosis',
    icon: <LocalHospitalIcon />,
    color: '#2980B9',
    description: 'Import ICD codes and descriptions',
  },
  {
    key: 'symptom',
    label: 'Symptoms',
    icon: <MonitorHeartIcon />,
    color: '#E8871E',
    description: 'Import symptom names and categories',
  },
  {
    key: 'examination_finding',
    label: 'Examination Findings',
    icon: <BiotechIcon />,
    color: '#8E44AD',
    description: 'Import examination finding names',
  },
  {
    key: 'lab_result',
    label: 'Lab Result',
    icon: <ScienceIcon />,
    color: '#D63031',
    description: 'Import lab test results',
  },
  {
    key: 'lab_test',
    label: 'Lab Investigation',
    icon: <BiotechIcon />,
    color: '#27AE60',
    description: 'Import lab investigation tests',
  },
];

export default function BulkImportPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1 }}>
        <Link
          underline="hover"
          color="text.secondary"
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
          onClick={() => navigate('/profile')}
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} />
          Profile
        </Link>
        <Typography color="text.primary" fontWeight={600}>
          Import Data
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4, mt: 1 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: 'text.primary' }}>
          Bulk Import Master Data
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Select a category to import data from Excel files
        </Typography>
      </Box>

      {/* Section cards */}
      <Grid container spacing={2.5}>
        {SECTIONS.map((section, index) => (
          <Grid key={section.key} size={{ xs: 12, sm: 6, md: 4 }}>
            <MotionCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.06 }}
              sx={{
                cursor: 'pointer',
                height: '100%',
                transition: 'all 200ms ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px ${section.color}20`,
                  borderColor: section.color,
                },
              }}
              onClick={() => navigate(`/profile/import-data/${section.key}`)}
            >
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    bgcolor: `${section.color}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    '& .MuiSvgIcon-root': {
                      fontSize: 26,
                      color: section.color,
                    },
                  }}
                >
                  {section.icon}
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                  {section.label}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                  {section.description}
                </Typography>
              </CardContent>
            </MotionCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
