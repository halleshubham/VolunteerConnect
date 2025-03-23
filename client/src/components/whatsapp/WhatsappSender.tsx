import { useState } from 'react';
import axios from 'axios';
import { useMutation } from '@tanstack/react-query';

export default function WhatsAppSender({numbers}:{numbers: string[]}) {
  const [numberss, setNumberss] = useState(numbers);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState(null);

  const sendMutation = useMutation({
    mutationFn: (data) => axios.post('/send-messages', data),
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
    <div className="p-5 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">📲 WhatsApp Message Sender</h1>
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
  );
}
