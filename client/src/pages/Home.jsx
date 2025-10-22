import {
  AppBar, Toolbar, Typography, Button, Container, Box, Card, CardContent, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Divider, CircularProgress, Alert
} from "@mui/material";
import { 
  LocationOn, AccessTime, Event, Group, Description, 
  EmojiEvents, Celebration, CalendarMonth 
} from "@mui/icons-material";
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

          {isManager && (
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
              Buradan kulüp etkinliklerini keşfedebilir ve detaylarına göz atabilirsin.
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

      {/* Detay Dialog - Mor Themed */}
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
          ) : detail ? (
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
            </Stack>
          ) : (
            <Typography>Etkinlik bulunamadı.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
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
