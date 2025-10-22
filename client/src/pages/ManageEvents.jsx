import { useEffect, useState, useMemo } from "react";
import {
  AppBar, Toolbar, Typography, Container, Paper, Stack,
  TextField, Button, Snackbar, Alert, Box, FormControl,
  InputLabel, Select, MenuItem
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { api } from "../api/index";

export default function ManageEvents() {
  const navigate = useNavigate();

  // ---- Kullanıcı bilgisi (role & managedClubId) ----
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const role = user?.role ?? null;
  const managedClubId = user?.managedClubId ?? null;
  const isManager = role === "Manager";
  const isAdmin = role === "Admin";

  // ---- Form state ----
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState(""); // YYYY-MM-DD
  const [eventTime, setEventTime] = useState(""); // HH:mm
  const [quota, setQuota] = useState("");
  const [clubId, setClubId] = useState("");
  const [description, setDescription] = useState("");

  // ---- UI state ----
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [okOpen, setOkOpen] = useState(false);

  // ---- Kulüp listesi ----
  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(true);

  // --- Helpers (bugünün tarih/saat stringleri) ---
  const pad = (n) => String(n).padStart(2, "0");

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);
  const nowTimeStr = useMemo(() => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  // Dinamik min değerleri
  const dateMin = todayStr;
  const timeMin = eventDate === todayStr ? nowTimeStr : undefined;

  // ---- Kulüpleri yükle (Manager ise tek kulübe indir, Select kilitli) ----
  useEffect(() => {
    let ignore = false;
    setClubsLoading(true);

    api.get("/api/Clubs")
      .then(res => {
        if (ignore) return;
        const list = Array.isArray(res.data) ? res.data : [];

        if (isManager && managedClubId) {
          const onlyMine = list.filter(c => c.clubId === managedClubId);
          setClubs(onlyMine);
          if (onlyMine.length > 0) setClubId(String(onlyMine[0].clubId));
        } else {
          // Admin (ve ileride başka roller) tüm kulüpleri görür
          setClubs(list);
        }
      })
      .catch(err => {
        console.error("Clubs fetch error:", err);
        setClubs([]);
      })
      .finally(() => { if (!ignore) setClubsLoading(false); });

    return () => { ignore = true; };
  }, [isManager, managedClubId]);

  // Tarih + saat -> ISO (yerel saatten)
  const toIsoFromDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const d = new Date(`${dateStr}T${timeStr}`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  // Geçmiş kontrolü (seçilen datetime şimdiden küçük olamaz)
  const isPastDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false;
    const selected = new Date(`${dateStr}T${timeStr}`);
    return selected.getTime() < Date.now();
  };

  // Doğrulama
  const validate = () => {
    if (!title.trim()) return "Etkinlik adı zorunludur.";
    if (!location.trim()) return "Etkinlik yeri zorunludur.";
    if (!eventDate) return "Etkinlik tarihi zorunludur.";
    if (!eventTime) return "Etkinlik saati zorunludur.";
    if (isPastDateTime(eventDate, eventTime))
      return "Geçmiş tarih/saat seçilemez. Lütfen bugünden sonraki bir zamanı seçin.";
    if (!quota || isNaN(Number(quota)) || Number(quota) <= 0)
      return "Kontenjan pozitif bir sayı olmalıdır.";
    if (!clubId) return "Lütfen bir kulüp seçin.";
    // UI güvenliği: Manager farklı kulüp seçmeye kalkarsa engelle
    if (isManager && managedClubId && parseInt(clubId, 10) !== managedClubId)
      return "Sadece yöneticisi olduğunuz kulüp için etkinlik oluşturabilirsiniz.";
    return "";
  };

  const hasErrors = !!validate();

  const handleSubmit = async () => {
    setError("");
    const v = validate();
    if (v) { setError(v); return; }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        location: location.trim(),
        startAt: toIsoFromDateTime(eventDate, eventTime), // sadece başlangıç
        endAt: null,                                      // backend tolere eder
        quota: Number(quota),
        clubId: parseInt(clubId, 10),
        description: description.trim() || null,
      };

      await api.post("/api/Events", payload);

      setOkOpen(true);
      navigate("/home"); // başarıdan sonra ana sayfa

      // (Opsiyonel) form temizliği
      setTitle(""); setLocation(""); setEventDate(""); setEventTime("");
      setQuota(""); setClubId(""); setDescription("");
    } catch (e) {
      const msg = e?.response?.data || "Etkinlik oluşturulamadı.";
      setError(typeof msg === "string" ? msg : "Etkinlik oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', m: 0, p: 0, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'auto', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <AppBar position="sticky" elevation={0} sx={{ background: 'linear-gradient(90deg, #6b21a8 0%, #8b5cf6 100%)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        <Toolbar sx={{ py: 1, px: { xs: 2, sm: 3, md: 4 } }}>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700, color: '#fff' }}>
            <span style={{ color: '#fff' }}>Uni</span><span style={{ color: '#e9d5ff' }}>Meet</span>
          </Typography>
          <Button onClick={() => navigate("/home")} sx={{ bgcolor: '#fff', color: '#6b21a8', fontWeight: 600, px: 3, '&:hover': { bgcolor: '#f3e8ff', transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(107,33,168,0.3)' }, transition: 'all 0.3s' }}>Ana Sayfa</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 5, mb: 6, px: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ mb: 4, animation: 'fadeIn 0.8s', '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(-20px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, background: 'linear-gradient(135deg, #6b21a8 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Etkinlik Oluştur</Typography>
          <Typography variant="body1" sx={{ color: '#64748b' }}>Yeni bir etkinlik oluşturmak için formu doldurun</Typography>
        </Box>
        <Paper sx={{ p: { xs: 2.5, sm: 4 }, border: '2px solid #e9d5ff', borderRadius: 3, bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(107,33,168,0.1)', animation: 'slideUp 0.6s', '@keyframes slideUp': { from: { opacity: 0, transform: 'translateY(30px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          <Stack spacing={3}>
            {error && <Alert severity="error" sx={{ border: '1px solid #f87171', borderRadius: 2 }}>{error}</Alert>}

            <TextField label="Etkinlik Adı" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth placeholder="Örn: Bahar Şenliği 2025" sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '#8b5cf6' }, '&.Mui-focused fieldset': { borderColor: '#6b21a8' } } }} />

            <TextField label="Yer" value={location} onChange={(e) => setLocation(e.target.value)} required fullWidth placeholder="Örn: Ana Kampüs - Konferans Salonu" sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '#8b5cf6' }, '&.Mui-focused fieldset': { borderColor: '#6b21a8' } } }} />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Tarih"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: dateMin }}
                required
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '#8b5cf6' }, '&.Mui-focused fieldset': { borderColor: '#6b21a8' } } }}
              />
              <TextField
                label="Saat"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={timeMin ? { min: timeMin } : {}}
                required
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '#8b5cf6' }, '&.Mui-focused fieldset': { borderColor: '#6b21a8' } } }}
              />
            </Box>

            <TextField
              label="Kontenjan"
              type="number"
              inputProps={{ min: 1 }}
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              required
              fullWidth
              placeholder="Örn: 50"
              sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '#8b5cf6' }, '&.Mui-focused fieldset': { borderColor: '#6b21a8' } } }}
            />

            <FormControl fullWidth required sx={{ '& .MuiOutlinedInput-root': { '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6b21a8' } } }}>
              <InputLabel id="club-label">Kulüp</InputLabel>
              <Select
                labelId="club-label"
                label="Kulüp"
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                disabled={clubsLoading || (isManager && !!managedClubId)}
              >
                {clubs.map((c) => (
                  <MenuItem key={c.clubId} value={String(c.clubId)}>
                    {c.name}
                  </MenuItem>
                ))}
                {!clubsLoading && clubs.length === 0 && (
                  <MenuItem disabled>Hiç kulüp bulunamadı</MenuItem>
                )}
              </Select>
            </FormControl>

            <TextField
              label="Etkinlik Açıklaması"
              multiline
              minRows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              placeholder="Etkinlik hakkında detaylı bilgi yazın..."
              sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '#8b5cf6' }, '&.Mui-focused fieldset': { borderColor: '#6b21a8' } } }}
            />

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
              <Button variant="outlined" onClick={() => navigate("/home")} sx={{ color: '#6b21a8', borderColor: '#e9d5ff', fontWeight: 600, px: 3, '&:hover': { borderColor: '#c084fc', bgcolor: '#faf5ff' } }}>Vazgeç</Button>
              <Button variant="contained" onClick={handleSubmit} disabled={submitting || hasErrors} sx={{ bgcolor: '#6b21a8', fontWeight: 600, px: 4, '&:hover': { bgcolor: '#581c87', transform: 'translateY(-2px)', boxShadow: '0 8px 16px rgba(107,33,168,0.3)' }, '&.Mui-disabled': { bgcolor: '#e9d5ff', color: '#c084fc' }, transition: 'all 0.3s' }}>
                {submitting ? "Kaydediliyor..." : "Oluştur"}
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Container>

      <Snackbar
        open={okOpen}
        autoHideDuration={2500}
        onClose={() => setOkOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity="success" variant="filled" sx={{ width: "100%", bgcolor: '#6b21a8', fontWeight: 600 }}>
          Etkinlik başarıyla oluşturuldu! 🎉
        </Alert>
      </Snackbar>
    </Box>
  );
}
