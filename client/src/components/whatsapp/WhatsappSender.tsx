import { useState, useRef, useEffect } from 'react';
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

interface MessageProgress {
  current: number;
  total: number;
  sent: number;
  failed: number;
  status: 'idle' | 'sending' | 'completed';
  results: Array<{ number: string; status: string; error?: string }>;
}

export default function WhatsAppSender({numbers}:{numbers: string[]}) {
  const [numberss, setNumberss] = useState(numbers);
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [response, setResponse] = useState(null);
  const [progress, setProgress] = useState<MessageProgress>({
    current: 0,
    total: 0,
    sent: 0,
    failed: 0,
    status: 'idle',
    results: []
  });
  const eventSourceRef = useRef<EventSource | null>(null);
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


  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleSetNumbers = (value:string)=>{
    const updatedNumbers =value.split(',').map(n => n.trim());
    setNumberss(updatedNumbers);
  }

  const handleImageUrlChange = (value: string) => {
    setImageUrl(value);
    // Set preview if it's a valid URL
    if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
      setImagePreview(value);
    } else {
      setImagePreview(null);
    }
  }

  const clearImage = () => {
    setImageUrl('');
    setImagePreview(null);
  }

  const handleSend = () => {
    if (!user?.username) return;

    // Reset progress
    setProgress({
      current: 0,
      total: numberss.length,
      sent: 0,
      failed: 0,
      status: 'sending',
      results: []
    });
    setResponse(null);

    // Use SSE for real-time progress (no need to send useSSE flag, we'll construct URL differently)
    const eventSource = new EventSource(`/api/dummy`); // We'll use fetch with SSE instead

    // Better approach: Use fetch with streaming
    fetch(`/send-message/${user.username}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        numbers: numberss,
        message,
        imageUrl: imageUrl || undefined, // Include image URL if provided
        useSSE: true // Enable SSE mode
      })
    }).then(response => {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      function readStream(): any {
        return reader?.read().then(({ done, value }) => {
          if (done) {
            return;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));

                if (data.type === 'started') {
                  setProgress(prev => ({
                    ...prev,
                    total: data.total,
                    status: 'sending'
                  }));
                } else if (data.type === 'progress') {
                  setProgress(prev => ({
                    ...prev,
                    current: data.current,
                    sent: data.sent,
                    failed: data.failed,
                    results: [...prev.results, {
                      number: data.number,
                      status: data.status,
                      error: data.error
                    }]
                  }));
                } else if (data.type === 'completed') {
                  setProgress(prev => ({
                    ...prev,
                    status: 'completed',
                    sent: data.sent,
                    failed: data.failed,
                    results: data.results
                  }));
                  setResponse(data);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }

          return readStream();
        });
      }

      readStream();
    }).catch(error => {
      console.error('Error sending messages:', error);
      setProgress(prev => ({
        ...prev,
        status: 'idle'
      }));
    });
  };

  return (

    <div className="p-5">
      <h2 className="text-xl font-bold">📲 WhatsApp Message Sender</h2>
      {statusData?.isReady ? (
        <div className="p-5 max-w-3xl mx-auto">
        <h1 className="text-xl font-bold mb-4">Connection Success</h1>

        {/* Numbers Input */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Phone Numbers</label>
          <textarea
            placeholder="Enter comma-separated numbers e.g., 9876543210,9123456789"
            className="border p-2 w-full rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
            value={numberss}
            onChange={(e) => handleSetNumbers(e.target.value)}
            disabled={progress.status === 'sending'}
          />
        </div>

        {/* Message Input */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Message</label>
          <textarea
            placeholder="Enter your message"
            className="border p-2 w-full rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={progress.status === 'sending'}
          />
        </div>

        {/* Image URL Input */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">
            Image (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
              className="border p-2 flex-1 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={imageUrl}
              onChange={(e) => handleImageUrlChange(e.target.value)}
              disabled={progress.status === 'sending'}
            />
            {imageUrl && (
              <button
                onClick={clearImage}
                className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
                disabled={progress.status === 'sending'}
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Supported formats: JPG, PNG, GIF, WebP (Max 16MB)
          </p>
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-4 p-4 bg-gray-50 rounded border">
            <p className="text-sm font-semibold mb-2">Image Preview:</p>
            <div className="flex justify-center">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-48 rounded border"
                onError={() => {
                  setImagePreview(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleSend}
          className="w-full bg-green-500 text-white px-4 py-3 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
          disabled={progress.status === 'sending' || !numberss.length || !message}
        >
          {progress.status === 'sending'
            ? `Sending... (${progress.current}/${progress.total})`
            : imageUrl
              ? '📎 Send Messages with Image'
              : '📤 Send Messages'}
        </button>

        {/* Info Banner when Image is Selected */}
        {imageUrl && progress.status === 'idle' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              📎 <strong>Image attached!</strong> Messages will include your image with the text as caption.
              {numberss.length > 10 && (
                <span className="block mt-1">
                  ⏱️ Note: Sending with images takes ~20-30% longer than text-only.
                </span>
              )}
            </p>
          </div>
        )}

        {/* Progress Bar */}
        {progress.status === 'sending' && (
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-semibold">
                {imageUrl ? '📎 Sending with Image' : '📤 Sending Messages'}
              </span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div
                className="bg-green-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>✅ Sent: {progress.sent}</span>
              <span>❌ Failed: {progress.failed}</span>
            </div>
            {imageUrl && progress.current === 0 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                ⬇️ Downloading image...
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {progress.status === 'completed' && (
          <div className="mt-5">
            <h2 className="font-semibold text-lg mb-3">Results Summary</h2>
            <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
              <p className="text-green-800">
                {imageUrl ? '📎' : '📤'} Successfully sent: <strong>{progress.sent}</strong> / {progress.total}
                {imageUrl && <span className="text-sm ml-2">(with image)</span>}
              </p>
              {progress.failed > 0 && (
                <p className="text-red-800 mt-1">
                  ❌ Failed: <strong>{progress.failed}</strong>
                </p>
              )}
            </div>

            <h3 className="font-semibold mb-2">Detailed Results:</h3>
            <div className="max-h-96 overflow-y-auto bg-gray-50 rounded p-3">
              {progress.results.map((result, index) => (
                <div
                  key={index}
                  className={`p-2 mb-2 rounded ${
                    result.status === 'Sent'
                      ? 'bg-green-100 border-green-300'
                      : 'bg-red-100 border-red-300'
                  } border`}
                >
                  <span className="font-mono">{result.number}</span>
                  <span className={`ml-2 ${
                    result.status === 'Sent' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.status === 'Sent' ? '✅' : '❌'} {result.status}
                  </span>
                  {result.error && (
                    <p className="text-xs text-red-600 mt-1">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
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
