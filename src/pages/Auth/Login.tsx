import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import type { AxiosError } from 'axios';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface ApiErrorBody {
  success?: boolean;
  message?: string;
  code?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  // Already authenticated? Bounce back to intended destination (or home)
  const redirectTo = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/';
  if (isAuthenticated) {
    navigate(redirectTo, { replace: true });
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError('');
    try {
      await login(values);
      toast.success('Signed in successfully');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const axErr = err as AxiosError<ApiErrorBody>;
      const status = axErr?.response?.status;
      const body = axErr?.response?.data;
      const msg =
        body?.message ||
        (status === 401 ? 'Invalid username or password' : null) ||
        (err instanceof Error ? err.message : 'Login failed');
      setServerError(msg);
      toast.error(msg);
    }
  };

  const busy = isLoading || isSubmitting;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #E3F2FD 0%, #F5F7FA 50%, #E0F2F1 100%)',
        p: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          border: 'none',
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              component="img"
              src="/Logo_Black_AQ%201.png"
              alt="AgentQure"
              sx={{ height: 64, maxWidth: '80%', objectFit: 'contain', mb: 1.5 }}
            />
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Sign in to your account
            </Typography>
          </Box>

          {serverError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {serverError}
            </Alert>
          )}

          <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              size="small"
              label="Username"
              autoComplete="username"
              autoFocus
              disabled={busy}
              error={!!errors.username}
              helperText={errors.username?.message}
              {...register('username')}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              size="small"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={busy}
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register('password')}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                        aria-label="toggle password visibility"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ mb: 3 }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={busy}
              sx={{
                py: 1.25,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)',
                },
              }}
            >
              {busy ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="center"
            display="block"
            mt={3}
          >
            Contact admin for access
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
