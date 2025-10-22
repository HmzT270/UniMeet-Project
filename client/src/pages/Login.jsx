// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/index";
import { Button, TextField, Stack, Typography, Paper, Alert, Box } from "@mui/material";

// 12 haneli öğrenci numarası + @dogus.edu.tr
const emailRegex = /^\d{12}@dogus\.edu\.tr$/;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const isValidEmail = (e) => emailRegex.test(String(e || "").trim().toLowerCase());

  const submit = async () => {
    setErr("");
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setErr("E-posta şu formatta olmalı: 202203011029@dogus.edu.tr (12 haneli öğrenci numarası)");
      return;
    }
    if (!password.trim()) {
      setErr("Şifre zorunludur.");
      return;
    }

    try {
      setLoading(true);

      // ÖNEMLİ: baseURL yalnızca host+port, endpoint mutlaka /api ile başlasın
      const { data } = await api.post("/api/Auth/login", {
        email: normalizedEmail,
        password,
      });

      // Backend dönen örnek: { userId, email, fullName, role, token }
      if (!data?.token) {
        setErr("Giriş başarılı görünüyor ama token gelmedi.");
        return;
      }

      // Frontend’in rol/buton kontrolü için 'token' anahtarını kaydediyoruz
      localStorage.setItem("token", data.token);

      // (Opsiyonel) kullanıcı bilgisini saklamak istersen:
      localStorage.setItem(
        "user",
        JSON.stringify({
          userId: data.userId,
          email: data.email,
          fullName: data.fullName,
          role: data.role,
        })
      );

      navigate("/home");
    } catch (e) {
      const msg = e?.response?.data || "Giriş başarısız.";
      setErr(typeof msg === "string" ? msg : "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const showFormatError = !!email && !isValidEmail(email);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        overflow: 'hidden',
        padding: { xs: '20px', sm: '24px', md: 0 },
        boxSizing: 'border-box',
      }}
    >
      {/* Başlık: "Uni" (koyu mor) + "Meet" (siyah) - Responsive */}
      <Typography
        sx={{
          mb: { xs: 2, sm: 3, md: 5 },
          fontWeight: 700,
          fontSize: { xs: '2rem', sm: '2.5rem', md: '3.75rem' },
          textAlign: 'center',
        }}
      >
        <span style={{ color: '#6b21a8' }}>Uni</span>
        <span style={{ color: '#000000' }}>Meet</span>
      </Typography>

      {/* Login Form - Koyu mor border ile - Responsive */}
      <Paper 
        elevation={8}
        sx={{ 
          p: { xs: 2, sm: 3.5, md: 4 },
          width: '100%',
          maxWidth: { xs: '100%', sm: '420px' },
          border: { xs: '2px solid #6b21a8', md: '3px solid #6b21a8' },
          borderRadius: 3,
          boxSizing: 'border-box',
        }}
      >
        <Typography 
          variant="h5" 
          sx={{ 
            mb: { xs: 2, md: 3 }, 
            textAlign: 'center', 
            fontWeight: 600, 
            color: '#6b21a8',
            fontSize: { xs: '1.4rem', sm: '1.5rem' }, // Mobilde daha büyük
          }}
        >
          Giriş Yap
        </Typography>
        <Stack spacing={{ xs: 2, md: 2.5 }}>
        {err && <Alert severity="error">{err}</Alert>}

        <TextField
          label="Okul E-Posta"
          placeholder="202203011029@dogus.edu.tr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={showFormatError}
          helperText={
            showFormatError
              ? "12 haneli no + @dogus.edu.tr"
              : ""
          }
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: { xs: '1rem', md: '1rem' }, // Mobilde normal font
              '&:hover fieldset': {
                borderColor: '#6b21a8',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#6b21a8',
              },
            },
            '& .MuiInputLabel-root': {
              fontSize: { xs: '1rem', md: '1rem' }, // Mobilde normal label
              '&.Mui-focused': {
                color: '#6b21a8',
              },
            },
            '& .MuiFormHelperText-root': {
              fontSize: { xs: '0.8rem', md: '0.75rem' },
            },
          }}
        />

        <TextField
          label="Şifre"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: { xs: '1rem', md: '1rem' },
              '&:hover fieldset': {
                borderColor: '#6b21a8',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#6b21a8',
              },
            },
            '& .MuiInputLabel-root': {
              fontSize: { xs: '1rem', md: '1rem' },
              '&.Mui-focused': {
                color: '#6b21a8',
              },
            },
          }}
        />

        <Button 
          variant="contained" 
          onClick={submit} 
          disabled={loading}
          fullWidth
          sx={{
            backgroundColor: '#6b21a8',
            '&:hover': {
              backgroundColor: '#581c87',
            },
            py: { xs: 1.5, md: 1.5 }, // Mobilde normal padding
            fontWeight: 600,
            fontSize: { xs: '1rem', md: '1rem' }, // Mobilde normal font
          }}
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </Button>
      </Stack>
    </Paper>
  </Box>
  );
}
