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
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            UniMeet — Ana Sayfa
          </Typography>

          {(isAdmin || isManager) && (
            <Button variant="contained" onClick={() => navigate("/manageevents")}>
              Etkinlik Oluştur
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Hoş geldin! 🎉
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Buradan kulüp etkinliklerini görüntüleyebilir, yetkin varsa düzenleyebilir veya silebilirsin.
          </Typography>

          {events.length === 0 ? (
            <Typography color="text.secondary">Henüz etkinlik bulunmuyor.</Typography>
          ) : (
            <Stack spacing={2}>
              {events.map((e) => (
                <Card key={e.eventId} sx={{ cursor: "pointer" }} onClick={() => openDetail(e.eventId)}>
                  <CardContent>
                    <Typography variant="h6">{e.title}</Typography>
                    <Typography color="text.secondary">
                      📍 {e.location} — 🕒 {fmt(e.startAt)}
                    </Typography>
                    {e.clubName && (
                      <Typography sx={{ mt: 1 }} color="primary">
                        {e.clubName}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      </Container>

      {/* Detay + Düzenle + Sil Dialog */}
      <Dialog open={detailOpen} onClose={closeDetail} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {detail?.title ?? "Etkinlik Detayı"}
          {detail?.isCancelled && (
            <Chip label="İptal Edildi" color="error" size="small" />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
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
                  <TextField label="Etkinlik Adı" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <TextField label="Yer" value={location} onChange={(e) => setLocation(e.target.value)} />
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <TextField
                      label="Tarih"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: todayStr }}
                    />
                    <TextField
                      label="Saat"
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={timeMin ? { min: timeMin } : {}}
                    />
                  </Box>
                  <TextField
                    label="Kontenjan"
                    type="number"
                    inputProps={{ min: 1 }}
                    value={quota}
                    onChange={(e) => setQuota(e.target.value)}
                  />
                  <TextField
                    label="Açıklama"
                    multiline
                    minRows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Stack>
              </>
            ) : (
              <Stack spacing={1.5}>
                {detail.clubName && (
                  <Chip label={detail.clubName} color="primary" variant="outlined" />
                )}
                <Divider />
                <Typography><strong>Yer:</strong> {detail.location}</Typography>
                <Typography><strong>Başlangıç:</strong> {fmt(detail.startAt)}</Typography>
                {detail.endAt && <Typography><strong>Bitiş:</strong> {fmt(detail.endAt)}</Typography>}
                <Typography><strong>Kontenjan:</strong> {detail.quota}</Typography>
                {detail.description && (
                  <>
                    <Divider />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Açıklama</Typography>
                    <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                      {detail.description}
                    </Typography>
                  </>
                )}
                {deleteErr && <Alert severity="error">{deleteErr}</Alert>}
              </Stack>
            )
          ) : null}
        </DialogContent>
        <DialogActions>
          {detail && (isAdmin || (isManager && managedClubId === detail.clubId)) && !detailLoading && !detailErr && !editMode && (
            <>
              {deleteAsk ? (
                <>
                  <Button onClick={() => setDeleteAsk(false)} disabled={deleting}>Vazgeç</Button>
                  <Button color="error" variant="contained" onClick={doDelete} disabled={deleting}>
                    {deleting ? "Siliniyor..." : "Sil"}
                  </Button>
                </>
              ) : (
                <>
                  <Button color="error" onClick={confirmDelete}>Sil</Button>
                  <Button variant="outlined" onClick={() => setEditMode(true)}>Düzenle</Button>
                </>
              )}
            </>
          )}
          {editMode && (
            <>
              <Button onClick={() => setEditMode(false)} disabled={editSaving}>Vazgeç</Button>
              <Button variant="contained" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </>
          )}
          <Button onClick={closeDetail}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
