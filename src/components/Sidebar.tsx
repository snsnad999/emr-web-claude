import { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Logout as LogoutIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Payment as PaymentIcon,
  ChevronLeft as ChevronLeftIcon,
  LocalHospital as ClinicIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';

const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

const navItems = [
  { label: 'Queue', icon: <DashboardIcon />, path: '/' },
  { label: 'Patients', icon: <PeopleIcon />, path: '/patients' },
  { label: 'Payments', icon: <PaymentIcon />, path: '/payments' },
];

const MotionBox = motion.create(Box);

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Navigation guard for bulk import
  const [guardDialog, setGuardDialog] = useState<{ open: boolean; targetPath: string }>({ open: false, targetPath: '' });

  // Profile dropdown menu
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const profileMenuOpen = Boolean(profileAnchor);

  const handleLogout = useCallback(() => {
    setProfileAnchor(null);
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleImportData = useCallback(() => {
    setProfileAnchor(null);
    navigate('/profile');
  }, [navigate]);

  const handleNavigate = useCallback((path: string) => {
    const isImportActive = (window as unknown as Record<string, unknown>).__bulkImportActive;
    if (isImportActive) {
      setGuardDialog({ open: true, targetPath: path });
      return;
    }
    navigate(path);
    if (isMobile) setSidebarOpen(false);
  }, [navigate, isMobile, setSidebarOpen]);

  const handleGuardConfirm = useCallback(() => {
    (window as unknown as Record<string, unknown>).__bulkImportActive = false;
    navigate(guardDialog.targetPath);
    setGuardDialog({ open: false, targetPath: '' });
    if (isMobile) setSidebarOpen(false);
  }, [guardDialog.targetPath, navigate, isMobile, setSidebarOpen]);

  const drawerWidth = sidebarOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED;

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'linear-gradient(180deg, #FAFCFB 0%, #F0F5F3 100%)',
      }}
    >
      {/* Clinic logo area */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarOpen ? 'space-between' : 'center',
          px: sidebarOpen ? 2.5 : 0,
          minHeight: 64,
        }}
      >
        {sidebarOpen ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <Box
                component="img"
                src="/Logo_Black_AQ%201.png"
                alt="AgentQure"
                sx={{ height: 40, maxWidth: '100%', objectFit: 'contain' }}
              />
            </Box>
            <IconButton
              size="small"
              onClick={toggleSidebar}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                width: 28,
                height: 28,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ChevronLeftIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </>
        ) : (
          <Tooltip title="Expand sidebar" placement="right">
            <IconButton
              size="small"
              onClick={toggleSidebar}
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0D7C66 0%, #17B890 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #095C4B 0%, #0D7C66 100%)',
                },
              }}
            >
              <ClinicIcon sx={{ color: '#fff', fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Divider sx={{ mx: sidebarOpen ? 2 : 1.5 }} />

      {/* Navigation */}
      <List sx={{ px: sidebarOpen ? 1.5 : 1, py: 2, flex: 1 }}>
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <Tooltip
              key={item.path}
              title={sidebarOpen ? '' : item.label}
              placement="right"
              arrow
            >
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  minHeight: 46,
                  justifyContent: sidebarOpen ? 'initial' : 'center',
                  px: sidebarOpen ? 1.5 : 1.5,
                  position: 'relative',
                  overflow: 'hidden',
                  color: isActive ? 'primary.main' : 'text.secondary',
                  backgroundColor: isActive ? 'action.selected' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive ? 'action.selected' : 'action.hover',
                  },
                  '& .MuiListItemIcon-root': {
                    color: isActive ? 'primary.main' : 'text.secondary',
                    minWidth: sidebarOpen ? 40 : 'auto',
                  },
                }}
              >
                {/* Active accent bar */}
                {isActive && (
                  <Box
                    component={motion.div}
                    layoutId="activeNavIndicator"
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: '20%',
                      bottom: '20%',
                      width: 3,
                      borderRadius: '0 4px 4px 0',
                      bgcolor: 'primary.main',
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <ListItemIcon>{item.icon}</ListItemIcon>
                {sidebarOpen && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '0.875rem',
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Divider sx={{ mx: sidebarOpen ? 2 : 1.5 }} />

      {/* User info (clickable — opens profile menu) */}
      <Tooltip title={sidebarOpen ? '' : (user?.name ?? 'User')} placement="right" arrow>
        <Box
          onClick={(e) => setProfileAnchor(e.currentTarget)}
          sx={{
            p: sidebarOpen ? 2 : 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            gap: 1.5,
            cursor: 'pointer',
            transition: 'background-color 200ms ease',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'primary.main',
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </Avatar>
          {sidebarOpen && (
            <MotionBox
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              sx={{ overflow: 'hidden', minWidth: 0 }}
            >
              <Typography variant="body2" fontWeight={600} noWrap>
                {user?.name ?? 'User'}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', textTransform: 'capitalize' }}
                noWrap
              >
                {user?.role ?? 'Doctor'}
              </Typography>
            </MotionBox>
          )}
        </Box>
      </Tooltip>

      <Menu
        anchorEl={profileAnchor}
        open={profileMenuOpen}
        onClose={() => setProfileAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 200,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <MenuItem onClick={handleImportData} sx={{ py: 1.25, fontSize: '0.875rem' }}>
          <ListItemIcon><CloudUploadIcon fontSize="small" /></ListItemIcon>
          Import Data
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ py: 1.25, fontSize: '0.875rem', color: 'error.main' }}>
          <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );

  const guardDialogElement = (
    <Dialog open={guardDialog.open} onClose={() => setGuardDialog({ open: false, targetPath: '' })} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <WarningIcon sx={{ color: 'warning.main', fontSize: 28 }} />
        Leave this page?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          You have an import in progress. Are you sure you want to leave? All data will be lost.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={() => setGuardDialog({ open: false, targetPath: '' })} color="inherit">
          Stay
        </Button>
        <Button onClick={handleGuardConfirm} variant="contained" color="error">
          Leave
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Mobile: temporary drawer
  if (isMobile) {
    return (
      <>
        <Drawer
          variant="temporary"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              border: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>
        {guardDialogElement}
      </>
    );
  }

  // Desktop: permanent drawer with collapse
  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            border: 'none',
            boxShadow: '1px 0 8px rgba(0,0,0,0.04)',
          },
        }}
      >
        {drawerContent}
      </Drawer>
      {guardDialogElement}
    </>
  );
}
