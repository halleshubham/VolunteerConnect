import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCode } from 'react-qrcode-logo';

const fetchStatus = async () => {
  const res = await axios.get('/status');
  return res.data;
};

const fetchQR = async () => {
  const res = await axios.get('/get-qr');
  return res.data;
};

export default function WhatsAppConnection() {
  const queryClient = useQueryClient();

  // WhatsApp Connection Status Query (polls every 5 sec)
  const { data: statusData } = useQuery({
    queryKey: ['whatsappStatus'],
    queryFn: fetchStatus,
    refetchInterval: 5000,
  });

  // QR Query (fetches only if not ready)
  const { data: qrData, refetch: refetchQR } = useQuery({
    queryKey: ['whatsappQR'],
    queryFn: fetchQR,
    enabled: statusData?.isReady === false, // Fetch QR only if not connected
    refetchInterval: statusData?.isReady === false ? 5000 : false,
  });

  return (
    <div className="p-5">
      <h2 className="text-xl font-bold">WhatsApp Connection Status</h2>
      {statusData?.isReady ? (
        <div className="text-green-600 font-semibold">✅ WhatsApp Connected</div>
      ) : qrData?.qr ? (
        <div className="mt-5">
          <p>Scan this QR Code to Connect:</p>
          <QRCode value={qrData.qr} size={300} />
        </div>
      ) : (
        <p>Waiting for QR Code...</p>
      )}
    </div>
  );
}
