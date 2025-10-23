import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Card,
  CardContent,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  TextField
} from "@mui/material";
import { 
  LocationOn, AccessTime, Event, Group, Description, 
  EmojiEvents, Celebration, CalendarMonth 
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/index";

export default function Home() {
  const navigate = useNavigate();

  // Kullanıcı bilgisi
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const role = user?.role ?? null;
  const managedClubId = user?.managedClubId ?? null;
  const isManager = role === "Manager";
  const isAdmin = role === "Admin";

  const [events, setEvents] = useState([]);

  // Detay dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");
  const [notFound, setNotFound] = useState(false); // sadece 404’te true

  // Edit modu state
  const [editMode, setEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");

  // Delete state
  const [deleteAsk, setDeleteAsk] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  // Edit form alanları
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState(""); // YYYY-MM-DD
  const [eventTime, setEventTime] = useState(""); // HH:mm
  const [quota, setQuota] = useState("");
  const [description, setDescription] = useState("");

  // Min tarih/saat
  const pad = (n) => String(n).padStart(2, "0");
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);
  const nowTimeStr = useMemo(() => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);
  const timeMin = eventDate === todayStr ? nowTimeStr : undefined;

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/Events");
        setEvents(data ?? []);
      } catch (err) {
        console.error("Etkinlikler alınamadı:", err);
      }
    })();
  }, []);

  const fmt = (iso) => (iso ? new Date(iso).toLocaleString("tr-TR") : "-");

  const refreshList = async () => {
    try {
      const { data } = await api.get("/api/Events");
      setEvents(data ?? []);
    } catch {
      // ignore
    }
  };

  const openDetail = async (id) => {
    // ÖNCE loading’i aç, sonra dialog’u göster ⇒ flicker yok
    setDetailLoading(true);
    setDetailErr("");
    setNotFound(false);
    setEditMode(false);
    setDeleteAsk(false);
    setDetailOpen(true);

    try {
      const { data } = await api.get(`/api/Events/${id}`);
      setDetail(data);
      // edit formu doldur
      if (data?.startAt) {
        const d = new Date(data.startAt);
        setEventDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        setEventTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } else {
        setEventDate("");
        setEventTime("");
      }
      setTitle(data?.title ?? "");
      setLocation(data?.location ?? "");
      setQuota(String(data?.quota ?? ""));
      setDescription(data?.description ?? "");
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) {
        setNotFound(true); // sadece gerçek 404’te uyarı göster
      } else {
        setDetailErr(e?.response?.data || "Etkinlik detayı yüklenemedi.");
      }
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const resetDetailState = () => {
    setDetail(null);
    setDetailErr("");
    setNotFound(false);
    setEditMode(false);
    setEditErr("");
    setDeleteAsk(false);
    setDeleteErr("");
    setEventDate("");
    setEventTime("");
    setTitle("");
    setLocation("");
    setQuota("");
    setDescription("");
  };

  const closeDetail = () => {
    setDetailOpen(false);
    // Dialog kapanma animasyonundan sonra state’i temizle (flicker olmasın)
    setTimeout(resetDetailState, 200);
  };

  const canEditOrDelete = !!detail && (isAdmin || (isManager && managedClubId === detail.clubId));

  // Edit doğrulama ve kaydet
  const isPastDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false;
    const selected = new Date(`${dateStr}T${timeStr}`);
    return selected.getTime() < Date.now();
  };
  const toIsoFromDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const d = new Date(`${dateStr}T${timeStr}`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const validateEdit = () => {
    if (!title.trim()) return "Etkinlik adı zorunludur.";
    if (!location.trim()) return "Etkinlik yeri zorunludur.";
    if (!eventDate) return "Etkinlik tarihi zorunludur.";
    if (!eventTime) return "Etkinlik saati zorunludur.";
    if (isPastDateTime(eventDate, eventTime))
      return "Geçmiş tarih/saat seçilemez.";
    if (!quota || isNaN(Number(quota)) || Number(quota) <= 0)
      return "Kontenjan pozitif bir sayı olmalıdır.";
    return "";
  };

  const saveEdit = async () => {
    const v = validateEdit();
    if (v) {
      setEditErr(v);
      return;
    }
    setEditErr("");
    setEditSaving(true);
    try {
      await api.put(`/api/Events/${detail.eventId}`, {
        title: title.trim(),
        location: location.trim(),
        startAt: toIsoFromDateTime(eventDate, eventTime),
        endAt: null,
        quota: Number(quota),
        clubId: detail.clubId, // kulüp değişikliği yok
        description: description.trim() || null,
        isCancelled: detail.isCancelled ?? false
      });

      // Liste + detay tazele
      const [listRes, detailRes] = await Promise.all([
        api.get("/api/Events"),
        api.get(`/api/Events/${detail.eventId}`)
      ]);
      setEvents(listRes.data ?? []);
      setDetail(detailRes.data ?? null);
      setEditMode(false);
    } catch (e) {
      setEditErr(e?.response?.data || "Kaydedilemedi.");
    } finally {
      setEditSaving(false);
    }
  };

  // Sil (soft-delete / iptal)
  const confirmDelete = () => {
    setDeleteAsk(true);
    setDeleteErr("");
  };

  const doDelete = async () => {
    if (!detail) return;
    setDeleting(true);
    setDeleteErr("");
    try {
      await api.delete(`/api/Events/${detail.eventId}`);
      await refreshList();
      closeDetail(); // kapat ve listeden düşmüş olacak
    } catch (e) {
      setDeleteErr(e?.response?.data || "Silme işlemi başarısız oldu.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        margin: 0,
        padding: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      {/* AppBar - Mor Gradient + Glassmorphism */}
      <AppBar 
        position="sticky"
        elevation={0}
        sx={{
          background: 'linear-gradient(90deg, #6b21a8 0%, #8b5cf6 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          width: '100%',
        }}
      >
        <Toolbar sx={{ py: 1, px: { xs: 2, sm: 3, md: 4 } }}>
          {/* Logo: Uni (beyaz) + Meet (açık mor) */}
          <Typography 
            variant="h5" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            <span style={{ color: '#ffffff' }}>Uni</span>
            <span style={{ color: '#e9d5ff' }}>Meet</span>
          </Typography>

          {(isAdmin || isManager) && (
            <Button 
              variant="contained" 
              onClick={() => navigate("/manageevents")}
              sx={{
                backgroundColor: '#ffffff',
                color: '#6b21a8',
                fontWeight: 600,
                px: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover': {
                  backgroundColor: '#f3e8ff',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(107,33,168,0.3)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <EmojiEvents sx={{ fontSize: '1.2rem' }} />
              Etkinlik Oluştur
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ mt: 5 }}>
          {/* Başlık Bölümü - Animasyonlu */}
          <Box
            sx={{
              mb: 5,
              animation: 'fadeIn 0.8s ease-out',
              '@keyframes fadeIn': {
                from: { opacity: 0, transform: 'translateY(-20px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Celebration sx={{ fontSize: '2.5rem', color: '#6b21a8' }} />
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #6b21a8 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Hoş geldin!
              </Typography>
            </Box>
            <Typography 
              variant="body1"
              sx={{ 
                color: '#64748b',
                fontSize: '1.1rem',
                ml: 0.5,
              }}
            >
              Buradan kulüp etkinliklerini görüntüleyebilir, yetkin varsa düzenleyebilir veya silebilirsin.
            </Typography>
          </Box>

          {/* Etkinlikler */}
          {events.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 10,
                animation: 'fadeIn 0.6s ease-out',
                '@keyframes fadeIn': {
                  from: { opacity: 0 },
                  to: { opacity: 1 },
                },
              }}
            >
              <CalendarMonth 
                sx={{ 
                  fontSize: '6rem', 
                  color: '#c084fc',
                  mb: 2,
                  opacity: 0.6,
                }} 
              />
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 600,
                  color: '#64748b',
                  mb: 1,
                }}
              >
                Henüz etkinlik bulunmuyor
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Yakında harika etkinlikler eklenecek!
              </Typography>
            </Box>
          ) : (
            <Stack spacing={3}>
              {events.map((e, index) => (
                <Card 
                  key={e.eventId}
                  sx={{ 
                    cursor: 'pointer',
                    border: '2px solid #e9d5ff',
                    borderRadius: 3,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    animation: `slideIn 0.5s ease-out ${index * 0.1}s both`,
                    '@keyframes slideIn': {
                      from: { 
                        opacity: 0, 
                        transform: 'translateY(30px)' 
                      },
                      to: { 
                        opacity: 1, 
                        transform: 'translateY(0)' 
                      },
                    },
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(107,33,168,0.15)',
                      borderColor: '#c084fc',
                    },
                  }} 
                  onClick={() => openDetail(e.eventId)}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
                      <EmojiEvents sx={{ fontSize: '1.8rem', color: '#6b21a8', mt: 0.5 }} />
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          fontWeight: 700,
                          color: '#1e293b',
                          flex: 1,
                        }}
                      >
                        {e.title}
                      </Typography>
                    </Box>
                    
                    <Stack direction="row" spacing={3} sx={{ mb: 2.5, ml: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <LocationOn sx={{ fontSize: '1.3rem', color: '#8b5cf6' }} />
                        <Typography 
                          sx={{ 
                            color: '#64748b',
                            fontSize: '0.95rem',
                            fontWeight: 500,
                          }}
                        >
                          {e.location}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <AccessTime sx={{ fontSize: '1.3rem', color: '#8b5cf6' }} />
                        <Typography 
                          sx={{ 
                            color: '#64748b',
                            fontSize: '0.95rem',
                            fontWeight: 500,
                          }}
                        >
                          {fmt(e.startAt)}
                        </Typography>
                      </Box>
                    </Stack>

                    {e.clubName && (
                      <Chip 
                        label={e.clubName}
                        icon={<Group sx={{ fontSize: '1.1rem' }} />}
                        sx={{
                          backgroundColor: '#f3e8ff',
                          color: '#6b21a8',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          border: '1px solid #e9d5ff',
                          '&:hover': {
                            backgroundColor: '#e9d5ff',
                          },
                          '& .MuiChip-icon': {
                            color: '#6b21a8',
                          },
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      </Container>

      {/* Detay + Düzenle + Sil Dialog - Mor Themed */}
      <Dialog 
        open={detailOpen} 
        onClose={closeDetail} 
        fullWidth 
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: '2px solid #e9d5ff',
          }
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #6b21a8 0%, #8b5cf6 100%)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '1.3rem',
            py: 2.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {detail?.title ?? "Etkinlik Detayı"}
          {detail?.isCancelled && (
            <Chip 
              label="İptal Edildi" 
              color="error" 
              size="small" 
              sx={{ 
                ml: 1,
                fontWeight: 600,
              }} 
            />
          )}
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          {detailLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: '#6b21a8' }} />
            </Box>
          ) : detailErr ? (
            <Alert severity="error">{String(detailErr)}</Alert>
          ) : notFound ? (
            <Alert severity="warning">Etkinlik bulunamadı.</Alert>
          ) : detail ? (
            editMode ? (
              <>
                {editErr && <Alert severity="error" sx={{ mb: 2 }}>{editErr}</Alert>}
                <Stack spacing={2}>
                  <TextField 
                    label="Etkinlik Adı" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '#8b5cf6' }, '&.Mui-focused fieldset': { borderColor: '#6b21a8' } } }}
                  />
                  <TextField 
                    label="Yer" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '#8b5cf6' }, '&.Mui-focused fieldset': { borderColor: '#6b21a8' } } }}
                  />
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <TextField
                      label="Tarih"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: todayStr }}
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
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '#8b5cf6' }, '&.Mui-focused fieldset': { borderColor: '#6b21a8' } } }}
                  />
                  <TextField
                    label="Açıklama"
                    multiline
                    minRows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '#8b5cf6' }, '&.Mui-focused fieldset': { borderColor: '#6b21a8' } } }}
                  />
                </Stack>
              </>
            ) : (
              <Stack spacing={2}>
                {detail.clubName && (
                  <Chip 
                    label={detail.clubName}
                    icon={<Group />}
                    sx={{
                      backgroundColor: '#f3e8ff',
                      color: '#6b21a8',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      py: 2.5,
                      border: '1px solid #e9d5ff',
                      '& .MuiChip-icon': {
                        color: '#6b21a8',
                      },
                    }}
                  />
                )}

                <Divider sx={{ borderColor: '#e9d5ff' }} />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <LocationOn sx={{ color: '#6b21a8', fontSize: '1.4rem' }} />
                  <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>
                    <strong style={{ color: '#6b21a8' }}>Yer:</strong> {detail.location}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <AccessTime sx={{ color: '#6b21a8', fontSize: '1.4rem' }} />
                  <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>
                    <strong style={{ color: '#6b21a8' }}>Başlangıç:</strong> {fmt(detail.startAt)}
                  </Typography>
                </Box>

                {detail.endAt && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Event sx={{ color: '#6b21a8', fontSize: '1.4rem' }} />
                    <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>
                      <strong style={{ color: '#6b21a8' }}>Bitiş:</strong> {fmt(detail.endAt)}
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Group sx={{ color: '#6b21a8', fontSize: '1.4rem' }} />
                  <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>
                    <strong style={{ color: '#6b21a8' }}>Kontenjan:</strong> {detail.quota}
                  </Typography>
                </Box>

                {detail.description && (
                  <>
                    <Divider sx={{ borderColor: '#e9d5ff', mt: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Description sx={{ color: '#6b21a8', fontSize: '1.4rem' }} />
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontWeight: 700,
                          color: '#6b21a8',
                        }}
                      >
                        Açıklama
                      </Typography>
                    </Box>
                    <Typography 
                      sx={{ 
                        whiteSpace: "pre-wrap",
                        color: '#64748b',
                        lineHeight: 1.7,
                        fontSize: '0.95rem',
                        pl: 5,
                      }}
                    >
                      {detail.description}
                    </Typography>
                  </>
                )}
                {deleteErr && <Alert severity="error">{deleteErr}</Alert>}
              </Stack>
            )
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          {detail && (isAdmin || (isManager && managedClubId === detail.clubId)) && !detailLoading && !detailErr && !editMode && (
            <>
              {deleteAsk ? (
                <>
                  <Button onClick={() => setDeleteAsk(false)} disabled={deleting} sx={{ color: '#6b21a8', fontWeight: 600 }}>Vazgeç</Button>
                  <Button color="error" variant="contained" onClick={doDelete} disabled={deleting} sx={{ fontWeight: 600 }}>
                    {deleting ? "Siliniyor..." : "Sil"}
                  </Button>
                </>
              ) : (
                <>
                  <Button color="error" onClick={confirmDelete} sx={{ fontWeight: 600 }}>Sil</Button>
                  <Button variant="outlined" onClick={() => setEditMode(true)} sx={{ color: '#6b21a8', borderColor: '#e9d5ff', fontWeight: 600, '&:hover': { borderColor: '#c084fc', bgcolor: '#faf5ff' } }}>Düzenle</Button>
                </>
              )}
            </>
          )}
          {editMode && (
            <>
              <Button onClick={() => setEditMode(false)} disabled={editSaving} sx={{ color: '#6b21a8', fontWeight: 600 }}>Vazgeç</Button>
              <Button variant="contained" onClick={saveEdit} disabled={editSaving} sx={{ bgcolor: '#6b21a8', fontWeight: 600, '&:hover': { bgcolor: '#581c87' } }}>
                {editSaving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </>
          )}
          <Button 
            onClick={closeDetail}
            sx={{
              color: '#6b21a8',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#f3e8ff',
              },
            }}
          >
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
