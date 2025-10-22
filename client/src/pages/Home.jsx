import {
  AppBar, Toolbar, Typography, Button, Container, Box, Card, CardContent, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Divider, CircularProgress, Alert
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getUserRole } from "../auth/token";
import { api } from "../api/index";

export default function Home() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [events, setEvents] = useState([]);

  // Dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");

  useEffect(() => {
    setRole(getUserRole());
  }, []);

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

  const isManager = role === "Manager" || role === "Admin";

  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailErr("");
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/api/Events/${id}`);
      setDetail(data);
    } catch (e) {
      setDetailErr(e?.response?.data || "Etkinlik detayı yüklenemedi.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
    setDetailErr("");
  };

  const fmt = (iso) => (iso ? new Date(iso).toLocaleString("tr-TR") : "-");

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            UniMeet — Ana Sayfa
          </Typography>

          {isManager && (
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
            Buradan kulüp etkinliklerini görüntüleyebilirsin.
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

      {/* Detay Dialog */}
      <Dialog open={detailOpen} onClose={closeDetail} fullWidth maxWidth="sm">
        <DialogTitle>
          {detail?.title ?? "Etkinlik Detayı"}
          {detail?.isCancelled && (
            <Chip label="İptal Edildi" color="error" size="small" sx={{ ml: 1 }} />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : detailErr ? (
            <Alert severity="error">{String(detailErr)}</Alert>
          ) : detail ? (
            <Stack spacing={1.5}>
              {detail.clubName && (
                <Chip label={`${detail.clubName}`} color="primary" variant="outlined" />
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
            </Stack>
          ) : (
            <Typography>Etkinlik bulunamadı.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetail}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
