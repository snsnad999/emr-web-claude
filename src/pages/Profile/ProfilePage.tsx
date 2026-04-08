import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import {
  FileUpload as FileUploadIcon,
  LocalHospital as ClinicIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  MedicalServices as MedicalIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

const MotionCard = motion.create(Card);

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: 'text.primary' }}>
          Profile & Settings
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Manage your account and organization settings
        </Typography>
      </Box>

      {/* User Info Card */}
      <MotionCard
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        sx={{ mb: 3 }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                background: 'linear-gradient(135deg, #0D7C66 0%, #17B890 100%)',
                fontSize: '1.6rem',
                fontWeight: 700,
              }}
            >
              {user?.name?.charAt(0)?.toUpperCase() ?? 'D'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                {user?.name ?? 'Dr. Dev Doctor'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {user?.specialization ?? 'General Physician'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  icon={<BadgeIcon sx={{ fontSize: 16 }} />}
                  label={user?.userId ?? 'dev-doctor-001'}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: 'divider' }}
                />
                <Chip
                  icon={<BusinessIcon sx={{ fontSize: 16 }} />}
                  label={user?.organizationId ?? 'org-001'}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: 'divider' }}
                />
                <Chip
                  icon={<ClinicIcon sx={{ fontSize: 16 }} />}
                  label={user?.branchId ?? 'branch-001'}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: 'divider' }}
                />
                <Chip
                  icon={<MedicalIcon sx={{ fontSize: 16 }} />}
                  label={user?.role ?? 'doctor'}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(13, 124, 102, 0.08)',
                    color: 'primary.main',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </MotionCard>

      {/* Data Management Card */}
      <MotionCard
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0D7C66 0%, #17B890 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileUploadIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Data Management
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                Import master data from Excel files for your organization
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: '0 4px 16px rgba(13, 124, 102, 0.12)',
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => navigate('/profile/import-data')}
              >
                <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, '&:last-child': { pb: 2.5 } }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: 'rgba(13, 124, 102, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FileUploadIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Import Data
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Bulk import medications, diagnoses, symptoms and more
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </MotionCard>
    </Box>
  );
}
