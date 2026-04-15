import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Breadcrumbs,
  Link,
  Autocomplete,
  TextField,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Menu as MenuIcon,
  NavigateNext as NavigateNextIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import debounce from 'lodash.debounce';
import { toast } from 'sonner';
import { patientApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import type { Patient } from '@/types';
import RegisterPatientDialog from '@/pages/Patients/components/RegisterPatientDialog';

const breadcrumbMap: Record<string, string> = {
  '/': 'Queue Dashboard',
  '/patients': 'Patients',
  '/patient': 'Patient Detail',
  '/visit-details': 'Prescription',
  '/prescription-final': 'Prescription Summary',
  '/analytics': 'Analytics',
  '/payments': 'Payments',
  '/profile': 'Profile',
};

function getBreadcrumbs(pathname: string): Array<{ label: string; path: string }> {
  if (pathname === '/') {
    return [{ label: 'Queue Dashboard', path: '/' }];
  }
  const basePath = '/' + pathname.split('/')[1];
  const label = breadcrumbMap[basePath] ?? basePath.replace('/', '').replace(/-/g, ' ');
  return [{ label: label.charAt(0).toUpperCase() + label.slice(1), path: pathname }];
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleSidebar } = useAppContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  const breadcrumbs = getBreadcrumbs(location.pathname);

  // On the Patients page, the global search live-filters the table instead of
  // acting as a navigation dropdown. It reads/writes the `?search=` URL param.
  const isPatientsPage = location.pathname === '/patients';
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';
  const [patientPageSearch, setPatientPageSearch] = useState(urlSearch);

  // Keep local input in sync when the URL param changes externally
  useEffect(() => {
    if (isPatientsPage) setPatientPageSearch(urlSearch);
  }, [urlSearch, isPatientsPage]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetUrlSearch = useCallback(
    debounce((val: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (val.trim()) next.set('search', val.trim());
        else next.delete('search');
        return next;
      }, { replace: true });
    }, 250),
    [setSearchParams],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetSearch = useCallback(
    debounce((val: string) => setDebouncedSearch(val), 300),
    [],
  );

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['header-patient-search', debouncedSearch],
    queryFn: () =>
      patientApi.getPatients({
        organizationId: user?.organizationId ?? '',
        search: debouncedSearch,
        limit: 8,
      }),
    enabled: debouncedSearch.length >= 2,
  });

  const searchResults: Patient[] = searchData?.data?.patients ?? [];

  // "Add Patient" sentinel row appended to the bottom of the dropdown
  const ADD_PATIENT_SENTINEL: Patient = {
    patientId: '__ADD_NEW__',
    name: '',
    uhid: '',
    phone: '',
  } as Patient;
  // Only show "Add new patient" option when user is actively typing
  const searchOptions: Patient[] = searchInput.trim().length >= 2
    ? [...searchResults, ADD_PATIENT_SENTINEL]
    : searchResults;

  // Only open the dropdown when the user has typed something
  const searchOpen = searchInput.trim().length >= 2;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: (t) => t.zIndex.appBar,
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: '64px !important', px: { xs: 1.5, sm: 2, md: 3 } }}>
        {/* Hamburger toggle */}
        <IconButton
          edge="start"
          onClick={toggleSidebar}
          sx={{
            mr: 0.5,
            color: 'text.secondary',
            '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* Breadcrumbs */}
        <Breadcrumbs
          separator={<NavigateNextIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
          sx={{ flex: 1, minWidth: 0 }}
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return isLast ? (
              <Typography
                key={crumb.path}
                variant="body2"
                fontWeight={600}
                color="text.primary"
                noWrap
              >
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={crumb.path}
                component="button"
                variant="body2"
                underline="hover"
                color="text.secondary"
                onClick={() => navigate(crumb.path)}
                sx={{ '&:hover': { color: 'primary.main' } }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>

        {/* Global patient search — on /patients it live-filters the table via URL param */}
        {!isMobile && isPatientsPage && (
          <TextField
            size="small"
            value={patientPageSearch}
            onChange={(e) => {
              setPatientPageSearch(e.target.value);
              debouncedSetUrlSearch(e.target.value);
            }}
            placeholder="Filter patients..."
            sx={{ width: 280 }}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 0.5, fontSize: 20 }} />,
              },
            }}
          />
        )}

        {!isMobile && !isPatientsPage && (
          <Autocomplete<Patient>
            size="small"
            options={searchOptions}
            open={searchOpen}
            getOptionLabel={(opt) =>
              opt.patientId === '__ADD_NEW__' ? '' : `${opt.name} - ${opt.uhid}`
            }
            inputValue={searchInput}
            onInputChange={(_, val) => {
              setSearchInput(val);
              debouncedSetSearch(val);
            }}
            onChange={(_, patient) => {
              if (patient && patient.patientId === '__ADD_NEW__') {
                setRegisterDialogOpen(true);
                return;
              }
              if (patient) {
                toast.success(`Patient selected: ${patient.name} (${patient.uhid})`);
                navigate(`/patient/${patient.patientId}`);
                setSearchInput('');
                setDebouncedSearch('');
              }
            }}
            value={null as Patient | null}
            loading={searchLoading}
            filterOptions={(x) => x}
            isOptionEqualToValue={(opt, val) => opt.patientId === val.patientId}
            sx={{ width: 280 }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search patients..."
                slotProps={{
                  input: {
                    ...params.InputProps,
                    startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 0.5, fontSize: 20 }} />,
                    endAdornment: (
                      <>
                        {searchLoading && <CircularProgress color="inherit" size={18} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
            renderOption={(props, option) => {
              const { key, ...rest } = props;
              if (option.patientId === '__ADD_NEW__') {
                return (
                  <Box
                    component="li"
                    key={key}
                    {...rest}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      color: 'primary.main',
                      fontWeight: 600,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <PersonAddIcon fontSize="small" />
                    <Typography variant="body2" fontWeight={600}>
                      {searchInput.trim()
                        ? `Add "${searchInput.trim()}" as new patient`
                        : 'Add new patient'}
                    </Typography>
                  </Box>
                );
              }
              return (
                <Box component="li" key={key} {...rest} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important' }}>
                  <Typography variant="body2" fontWeight={600}>{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{option.uhid} | {option.phone}</Typography>
                </Box>
              );
            }}
          />
        )}

      </Toolbar>

      {/* Register dialog opened from the "Add patient" row in the search dropdown */}
      <RegisterPatientDialog
        open={registerDialogOpen}
        onClose={() => {
          setRegisterDialogOpen(false);
          if (debouncedSearch.length >= 2) {
            queryClient.invalidateQueries({ queryKey: ['header-patient-search'] });
          }
        }}
        initialName={searchInput.trim() && !/^\d+$/.test(searchInput.trim()) ? searchInput.trim() : undefined}
        initialPhone={/^\d{10}$/.test(searchInput.trim()) ? searchInput.trim() : undefined}
      />
    </AppBar>
  );
}
