
import React, { useState } from 'react';

interface CreateAlbumModalProps {
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}

const THEME_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(THEME_COLORS[0]);

  return (
    <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
      <header className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">New Album</h2>
        <button onClick={onClose} className="text-zinc-400">Cancel</button>
      </header>

      <div className="space-y-8">
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Album Name</label>
          <input 
            autoFocus
            type="text" 
            placeholder="e.g. Summer Vacation"
            className="w-full bg-zinc-900 border-none rounded-2xl p-4 text-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Theme Color</label>
          <div className="flex flex-wrap gap-4">
            {THEME_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-12 h-12 rounded-full transition-transform ${color === c ? 'scale-125 ring-4 ring-white' : 'scale-100'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pb-8">
        <button 
          onClick={() => name && onSave(name, color)}
          disabled={!name}
          className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg disabled:opacity-50 active:scale-95 transition-transform"
        >
          Create Album
        </button>
      </div>
    </div>
  );
};

export default CreateAlbumModal;
