import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCode } from 'react-qrcode-logo';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useState } from 'react';
import WhatsAppSender from '@/components/whatsapp/WhatsappSender';

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

  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  <div className="flex h-screen overflow-hidden bg-gray-50">
    <Sidebar />
    
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Contact Management" onOpenSidebar={() => setSidebarOpen(true)} />
      
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {/* Action Bar */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <WhatsAppSender numbers={[]}/>
          </div>
        </div>
      </main>
    </div>
  </div>
    
  );
}
