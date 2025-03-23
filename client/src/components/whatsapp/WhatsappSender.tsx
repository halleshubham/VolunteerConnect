import { useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { QRCode } from 'react-qrcode-logo';

const fetchStatus = async (userId :string) => {
    const res = await axios.get(`/status/${userId}`);
    return res.data;
  };
  
  const fetchQR = async (userId: string) => {
    const res = await axios.get(`/auth/${userId}`);
    return res.data;
  };


export default function WhatsAppSender({numbers}:{numbers: string[]}) {
  const [numberss, setNumberss] = useState(numbers);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState(null);
  const {user} = useAuth();

  const queryClient = useQueryClient();

  // WhatsApp Connection Status Query (polls every 5 sec)
  const { data: statusData } = useQuery({
    queryKey: ['whatsappStatus'],
    queryFn: ()=>fetchStatus(user?.username || ""),
    refetchInterval: 5000,
  });

  // QR Query (fetches only if not ready)
  const { data: qrData, refetch: refetchQR } = useQuery({
    queryKey: ['whatsappQR'],
    queryFn: ()=>fetchQR(user?.username || ""),
    enabled: statusData?.isReady === false, // Fetch QR only if not connected
    refetchInterval: statusData?.isReady === false ? 5000 : false,
  });


  const sendMutation = useMutation({
    mutationFn: (data) => axios.post(`/send-message/${user?.username}`, data),
    onSuccess: (res) => setResponse(res.data),
  });

  const handleSetNumbers = (value:string)=>{
    const updatedNumbers =value.split(',').map(n => n.trim());
    setNumberss(updatedNumbers);
  }

  const handleSend = () => {
    // const numList = numbers.split(',').map(n => n.trim());
    sendMutation.mutate({ numbers: numberss, message });
  };

  return (

    <div className="p-5">
      <h2 className="text-xl font-bold">📲 WhatsApp Message Sender</h2>
      {statusData?.isReady ? (
        <div className="p-5 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-4">Connection Success</h1>
        <textarea
          placeholder="Enter comma-separated numbers e.g., 9876543210,9123456789"
          className="border p-2 w-full mb-4"
          value={numberss}
          onChange={(e) => handleSetNumbers(e.target.value)}
        />
        <textarea
          placeholder="Enter your message"
          className="border p-2 w-full mb-4"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          onClick={handleSend}
          className="bg-green-500 text-white px-4 py-2 rounded"
          disabled={sendMutation.isLoading}
        >
          {sendMutation.isLoading ? 'Sending...' : 'Send'}
        </button>
  
        {response && (
          <div className="mt-5">
            <h2 className="font-semibold">Results:</h2>
            <pre className="bg-gray-100 p-3">{JSON.stringify(response.results, null, 2)}</pre>
          </div>
        )}
      </div>
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
