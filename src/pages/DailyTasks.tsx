// src/pages/DailyTasks.tsx
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, RotateCcw, CheckSquare } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatTime } from '@/utils';

export default function DailyTasks() {
  const { tasks, toggleTask, resetTasks } = useStore();

  const openingTasks = tasks.filter((t) => t.type === 'opening');
  const closingTasks = tasks.filter((t) => t.type === 'closing');

  const openingDone = openingTasks.filter((t) => t.completed).length;
  const closingDone = closingTasks.filter((t) => t.completed).length;

  const totalDone = openingDone + closingDone;
  const total = tasks.length;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Daily Tasks</h2>
          <p className="text-sm text-gray-500">{totalDone}/{total} tasks completed</p>
        </div>
        <button
          onClick={resetTasks}
          className="btn-ghost flex items-center gap-2 text-sm"
        >
          <RotateCcw size={15} />
          Reset All
        </button>
      </div>

      {/* Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-bold text-[#0F5132]">{Math.round((totalDone / total) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalDone / total) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-[#0F5132] rounded-full"
          />
        </div>
      </div>

      {/* Opening Tasks */}
      <TaskSection
        title="Opening Tasks"
        emoji="☀️"
        tasks={openingTasks}
        done={openingDone}
        onToggle={toggleTask}
      />

      {/* Closing Tasks */}
      <TaskSection
        title="Closing Tasks"
        emoji="🌙"
        tasks={closingTasks}
        done={closingDone}
        onToggle={toggleTask}
      />
    </div>
  );
}

function TaskSection({
  title, emoji, tasks, done, onToggle,
}: {
  title: string;
  emoji: string;
  tasks: import('@/types').Task[];
  done: number;
  onToggle: (id: string) => void;
}) {
  const progress = tasks.length > 0 ? (done / tasks.length) * 100 : 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <span>{emoji}</span>
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden">
            <motion.div
              animate={{ width: `${progress}%` }}
              className={`h-full rounded-full ${
                progress === 100 ? 'bg-emerald-500' : 'bg-[#0F5132]'
              }`}
            />
          </div>
          <span className="text-xs font-semibold text-gray-500">{done}/{tasks.length}</span>
          {done === tasks.length && (
            <span className="badge bg-emerald-100 text-emerald-700">Done</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {tasks.map((task) => (
          <motion.button
            key={task.id}
            onClick={() => onToggle(task.id)}
            layout
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
              task.completed
                ? 'bg-emerald-50 hover:bg-emerald-100'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="flex-shrink-0">
              {task.completed ? (
                <CheckCircle2 size={20} className="text-emerald-600" />
              ) : (
                <Circle size={20} className="text-gray-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                task.completed ? 'text-gray-400 line-through' : 'text-gray-900'
              }`}>
                {task.label}
              </p>
              {task.completed && task.completedAt && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  Completed at {formatTime(task.completedAt)} by {task.completedBy}
                </p>
              )}
            </div>
            {task.completed && (
              <span className="text-emerald-500 flex-shrink-0">
                <CheckSquare size={16} />
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
