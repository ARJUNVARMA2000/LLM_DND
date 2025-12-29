import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

export default function NotificationStack() {
  const notifications = useGameStore((s) => s.notifications);
  const removeNotification = useGameStore((s) => s.removeNotification);

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'item':
        return 'border-l-[var(--accent-blue)]';
      case 'gold':
        return 'border-l-[var(--text-gold)]';
      case 'quest':
        return 'border-l-[var(--accent-purple)]';
      case 'combat':
        return 'border-l-[var(--accent-red-bright)]';
      case 'error':
        return 'border-l-[var(--accent-red)]';
      default:
        return 'border-l-[var(--accent-gold)]';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'item':
        return '📦';
      case 'gold':
        return '💰';
      case 'quest':
        return '📜';
      case 'combat':
        return '⚔️';
      case 'error':
        return '⚠️';
      default:
        return '✨';
    }
  };

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-lg w-full px-4">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            className={`flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur-sm border-l-4 rounded ${getNotificationStyle(notif.type)} cursor-pointer`}
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            onClick={() => removeNotification(notif.id)}
            whileHover={{ scale: 1.02 }}
          >
            <span className="text-xl">{getIcon(notif.type)}</span>
            <span className="text-[var(--text-primary)]">{notif.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

