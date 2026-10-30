/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShopTask, UserAccount, TaskCategory } from '../types';
import { StorageService } from '../services/storage';
import { ConfirmDialog } from './ConfirmDialog';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  RotateCcw,
  X,
  Check,
  Tag,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';

interface TaskManagementTabProps {
  tasks: ShopTask[];
  activeShopId: string;
  lang: 'en' | 'bn';
  currentUser: UserAccount | null;
  onRefresh: () => void;
}

export const TaskManagementTab: React.FC<TaskManagementTabProps> = ({
  tasks,
  activeShopId,
  lang,
  currentUser,
  onRefresh,
}) => {
  const isMaster = currentUser?.role === 'master_admin';
  const isReadOnly = currentUser?.role === 'guest_viewer';

  // Categories per shop
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Manage Categories Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [newCatNameBn, setNewCatNameBn] = useState('');
  const [newCatColor, setNewCatColor] = useState('#007F73');
  const [catError, setCatError] = useState('');

  // Editing Category Inline in Modal
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatNameEn, setEditCatNameEn] = useState('');
  const [editCatNameBn, setEditCatNameBn] = useState('');
  const [editCatColor, setEditCatColor] = useState('#007F73');

  // Category Deletion Confirmation Modal (with reallocate / delete tasks)
  const [catToDelete, setCatToDelete] = useState<{ category: TaskCategory; taskCount: number } | null>(null);
  const [reallocateTargetId, setReallocateTargetId] = useState<string>('');

  // Add Task Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskTitleEn, setTaskTitleEn] = useState('');
  const [taskTitleBn, setTaskTitleBn] = useState('');
  const [category, setCategory] = useState<string>('kitchen');
  const [dueTime, setDueTime] = useState('11:00 AM');

  // Edit Task Modal State
  const [editingTask, setEditingTask] = useState<ShopTask | null>(null);
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editTitleBn, setEditTitleBn] = useState('');
  const [editCategory, setEditCategory] = useState<string>('kitchen');
  const [editDueTime, setEditDueTime] = useState('');

  // Delete Task Confirmation Modal
  const [taskToDelete, setTaskToDelete] = useState<ShopTask | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRemoveDemoConfirm, setShowRemoveDemoConfirm] = useState(false);
  const [catAlertMsg, setCatAlertMsg] = useState<string | null>(null);

  // Load categories whenever active shop changes
  useEffect(() => {
    loadCategories();
  }, [activeShopId]);

  const loadCategories = () => {
    if (!activeShopId) return;
    const cats = StorageService.getTaskCategories(activeShopId);
    setTaskCategories(cats);
    if (cats.length > 0 && !cats.some(c => c.id === category)) {
      setCategory(cats[0].id);
    }
  };

  const getCategoryLabel = (catId: string): string => {
    const found = taskCategories.find(c => c.id === catId);
    if (found) {
      return lang === 'bn' ? (found.nameBn || found.name) : found.name;
    }
    return lang === 'bn' ? 'শ্রেণীবিহীন' : 'Uncategorized';
  };

  const filteredTasks = tasks.filter(t => {
    if (filterCategory === 'all') return true;
    return t.category === filterCategory;
  });

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Toggle Completion
  const handleToggle = (taskId: string) => {
    if (isReadOnly) return;
    StorageService.toggleTask(taskId);
    onRefresh();
  };

  // Add Task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !taskTitleEn.trim()) return;

    StorageService.saveTask({
      id: crypto.randomUUID(),
      shopId: activeShopId,
      title: taskTitleEn.trim(),
      titleBn: taskTitleBn.trim() || taskTitleEn.trim(),
      category: category || (taskCategories[0]?.id || 'kitchen'),
      isCompleted: false,
      dueDate: dueTime,
    });

    setShowAddModal(false);
    setTaskTitleEn('');
    setTaskTitleBn('');
    onRefresh();
  };

  // Save Edit Task
  const handleSaveEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMaster || !editingTask || !editTitleEn.trim()) return;

    editingTask.title = editTitleEn.trim();
    editingTask.titleBn = editTitleBn.trim() || editTitleEn.trim();
    editingTask.category = editCategory;
    editingTask.dueDate = editDueTime;

    StorageService.saveTask(editingTask);
    setEditingTask(null);
    onRefresh();
  };

  // Confirm Delete Task
  const handleConfirmDelete = () => {
    if (!isMaster || !taskToDelete) return;
    StorageService.deleteTask(taskToDelete.id);
    setTaskToDelete(null);
    onRefresh();
  };

  // Load suggested sweet shop checklist tasks
  const handleLoadSuggestedTasks = () => {
    if (!activeShopId) return;
    StorageService.loadSuggestedTasks(activeShopId);
    onRefresh();
  };

  // Reset Checklist to sweet shop standard defaults
  const handleResetChecklist = () => {
    if (!isMaster) return;
    setShowResetConfirm(true);
  };

  const executeResetChecklist = () => {
    setShowResetConfirm(false);
    // Ensure default categories exist
    const defaultCats = [
      { id: 'kitchen', name: 'Kitchen Prep', nameBn: 'রান্নাঘর ও কারিগর' },
      { id: 'counter', name: 'Counter Setup', nameBn: 'কাউন্টার ও ডিসপ্লে' },
      { id: 'hygiene', name: 'Hygiene', nameBn: 'পরিচ্ছন্নতা ও স্বাস্থ্যবিধি' },
      { id: 'accounts', name: 'Accounts Closing', nameBn: 'হিসাব ও খাতা' },
    ];
    StorageService.saveTaskCategories(activeShopId, defaultCats);
    loadCategories();

    const defaultChecklist: ShopTask[] = [
      {
        id: crypto.randomUUID(),
        shopId: activeShopId,
        title: 'Verify fresh cow milk & chana batch delivery',
        titleBn: 'সকালের তাজা গরুর দুধ ও ছানার গুণগত মান পরীক্ষা',
        category: 'kitchen',
        isCompleted: false,
        dueDate: '07:30 AM',
      },
      {
        id: crypto.randomUUID(),
        shopId: activeShopId,
        title: 'Test sugar syrup (sheera) consistency & density',
        titleBn: 'মিষ্টির চিনির শিরার ঘনত্ব ও তাপমাত্রা যাচাই',
        category: 'kitchen',
        isCompleted: false,
        dueDate: '08:30 AM',
      },
      {
        id: crypto.randomUUID(),
        shopId: activeShopId,
        title: 'Sanitize frying pans & confectionery cooking equipment',
        titleBn: 'কড়াই, খুন্তি ও কারিগরের রান্নার পাত্র জীবাণুমুক্তকরণ',
        category: 'hygiene',
        isCompleted: false,
        dueDate: '09:00 AM',
      },
      {
        id: crypto.randomUUID(),
        shopId: activeShopId,
        title: 'Arrange Rosogolla, Chamcham, Kalajam in glass showcase',
        titleBn: 'কাউন্টারের কাঁচের শোকেসে রসগোল্লা, চমচম ও কালাজাম সাজানো',
        category: 'counter',
        isCompleted: false,
        dueDate: '09:30 AM',
      },
      {
        id: crypto.randomUUID(),
        shopId: activeShopId,
        title: 'Calibrate digital weighing scale with test weights',
        titleBn: 'ডিজিটাল ওজন স্কেল ক্যালিব্রেশন ও নিখুঁত পরিমাপ যাচাই',
        category: 'counter',
        isCompleted: false,
        dueDate: '10:00 AM',
      },
      {
        id: crypto.randomUUID(),
        shopId: activeShopId,
        title: 'Inspect and log temperature of milk sweets display chiller',
        titleBn: 'মিষ্টির কুলার ও ফ্রিজের তাপমাত্রা ৪° সেলসিয়াসে নিশ্চিতকরণ',
        category: 'hygiene',
        isCompleted: false,
        dueDate: '12:00 PM',
      },
      {
        id: crypto.randomUUID(),
        shopId: activeShopId,
        title: 'Stock food-grade sweet boxes, bags, and tissue packets',
        titleBn: 'ফুড-গ্রেড মিষ্টির প্যাকেট, বক্স ও শপিং ব্যাগ পর্যাপ্ত রাখা',
        category: 'counter',
        isCompleted: false,
        dueDate: '03:00 PM',
      },
      {
        id: crypto.randomUUID(),
        shopId: activeShopId,
        title: 'Evening counter cash tally & daily invoice reconciliation',
        titleBn: 'রাতের ক্যাশ টাকার হিসাব ও ভাউচারের মেলবন্ধন সম্পন্ন',
        category: 'accounts',
        isCompleted: false,
        dueDate: '10:30 PM',
      },
    ];

    StorageService.saveTasksForShop(activeShopId, defaultChecklist);
    onRefresh();
  };

  // --- Category Management Actions ---
  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');
    const en = newCatNameEn.trim();
    const bn = newCatNameBn.trim() || en;

    if (!en) {
      setCatError(lang === 'bn' ? 'ইংরেজি নাম আবশ্যক' : 'English name is required');
      return;
    }

    // Check duplicate
    const exists = taskCategories.some(
      c => c.name.toLowerCase() === en.toLowerCase() || (bn && c.nameBn?.toLowerCase() === bn.toLowerCase())
    );
    if (exists) {
      setCatError(lang === 'bn' ? 'এই নামের ক্যাটাগরি ইতিমধ্যে রয়েছে' : 'Category with this name already exists');
      return;
    }

    StorageService.addTaskCategory(activeShopId, en, bn, newCatColor);
    setNewCatNameEn('');
    setNewCatNameBn('');
    setNewCatColor('#007F73');
    loadCategories();
  };

  const handleStartEditCategory = (cat: TaskCategory) => {
    setEditingCatId(cat.id);
    setEditCatNameEn(cat.name);
    setEditCatNameBn(cat.nameBn || cat.name);
    setEditCatColor(cat.color || '#007F73');
  };

  const handleSaveRenameCategory = (catId: string) => {
    const en = editCatNameEn.trim();
    const bn = editCatNameBn.trim() || en;
    if (!en) return;

    // Check duplicate among other categories
    const exists = taskCategories.some(
      c => c.id !== catId && c.name.toLowerCase() === en.toLowerCase()
    );
    if (exists) {
      setCatError(lang === 'bn' ? 'এই নামের ক্যাটাগরি ইতিমধ্যে রয়েছে' : 'Duplicate category name');
      return;
    }

    StorageService.updateTaskCategory(activeShopId, catId, en, bn, editCatColor);
    setEditingCatId(null);
    loadCategories();
    onRefresh();
  };

  const handleInitiateDeleteCategory = (cat: TaskCategory) => {
    const tasksInCat = tasks.filter(t => t.category === cat.id);
    const otherCats = taskCategories.filter(c => c.id !== cat.id);

    if (tasksInCat.length > 0) {
      setCatToDelete({ category: cat, taskCount: tasksInCat.length });
      setReallocateTargetId(otherCats[0]?.id || '');
    } else {
      // Direct delete if empty
      StorageService.deleteTaskCategory(activeShopId, cat.id);
      if (filterCategory === cat.id) {
        setFilterCategory('all');
      }
      loadCategories();
      onRefresh();
    }
  };

  const handleRemoveDemoTasks = () => {
    StorageService.removeDemoTasks(activeShopId);
    setShowRemoveDemoConfirm(false);
    onRefresh();
  };

  // Confirm delete category with tasks
  const handleExecuteCategoryDeleteWithAction = (action: 'reallocate' | 'deleteTasks') => {
    if (!catToDelete) return;
    const catId = catToDelete.category.id;

    if (action === 'reallocate' && reallocateTargetId) {
      // Reassign all tasks in this category
      const allTasks = StorageService.getTasks();
      allTasks.forEach(t => {
        if (t.shopId === activeShopId && t.category === catId) {
          t.category = reallocateTargetId;
        }
      });
      StorageService.saveAllTasks(allTasks);
    } else if (action === 'deleteTasks') {
      // Delete tasks in this category
      const remainingTasks = StorageService.getTasks().filter(
        t => !(t.shopId === activeShopId && t.category === catId)
      );
      StorageService.saveAllTasks(remainingTasks);
    }

    StorageService.deleteTaskCategory(activeShopId, catId);
    if (filterCategory === catId) {
      setFilterCategory('all');
    }
    setCatToDelete(null);
    loadCategories();
    onRefresh();
  };

  if (!activeShopId) {
    return (
      <div className="p-12 text-center bg-white dark:bg-[#14201C] rounded-3xl border border-[#DCE4E1] dark:border-[#1E302B] shadow-xs">
        <CheckSquare className="w-10 h-10 mx-auto text-[#007F73]/40 dark:text-teal-400/40 mb-3" />
        <h4 className="text-sm font-bold text-[#17211F] dark:text-stone-100">
          {lang === 'bn' ? 'দোকান ব্রাঞ্চ নির্বাচন করুন' : 'No shop branch active'}
        </h4>
        <p className="text-xs text-[#626E6A] dark:text-stone-400 mt-1 max-w-sm mx-auto">
          {lang === 'bn' ? 'চেকলিস্ট ও কাজ পরিচালনা করতে প্রথমে একটি দোকান তৈরি বা নির্বাচন করুন।' : 'Please create or select a shop branch to view and manage tasks.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Task Header & Progress Card */}
      <div className="p-5 bg-white dark:bg-[#14201C] rounded-3xl border border-[#DCE4E1] dark:border-[#1E302B] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#007F73]/15 text-[#007F73] dark:bg-teal-500/20 dark:text-teal-300 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#17211F] dark:text-stone-100 leading-tight">
                {lang === 'bn' ? 'দোকানের দৈনিক চেকলিস্ট ও কাজ' : 'Daily Sweet Shop Operations Checklist'}
              </h2>
              <p className="text-xs text-[#626E6A] dark:text-stone-400">
                {lang === 'bn'
                  ? 'মাস্টার অ্যাডমিন যেকোনো কাজ ও ক্যাটাগরি সম্পাদনা, যোগ বা মুছে ফেলতে পারেন'
                  : 'Fully editable, customizable, and manageable by Master Admin'}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="w-44 h-2.5 bg-[#F0F4F2] dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#007F73] dark:bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-[#007F73] dark:text-teal-400">
              {completedCount} / {tasks.length} ({progressPercent}%)
            </span>
          </div>
        </div>

        {isMaster && (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={handleResetChecklist}
              title="Reset to default sweet shop tasks"
              className="px-3 py-2 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#626E6A] dark:text-stone-300 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition min-h-[38px]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#007F73]" />
              <span>{lang === 'bn' ? 'রিসেট' : 'Reset'}</span>
            </button>

            <button
              onClick={() => {
                setShowCategoryModal(true);
                setCatError('');
              }}
              title="Manage Categories"
              className="px-3 py-2 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#007F73] dark:text-teal-300 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition min-h-[38px]"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'ক্যাটাগরি' : 'Categories'}</span>
            </button>

            <button
              onClick={() => {
                if (taskCategories.length > 0) {
                  setCategory(taskCategories[0].id);
                }
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs active:scale-95 min-h-[38px]"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'bn' ? 'নতুন কাজ যোগ করুন' : 'Add Daily Task'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Category Filter Pills / Empty State */}
      {taskCategories.length === 0 ? (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#14201C] border border-dashed border-[#DCE4E1] dark:border-[#1E302B] flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2 text-[#626E6A] dark:text-stone-400">
            <Tag className="w-4 h-4 text-[#007F73]" />
            <span>{lang === 'bn' ? 'কোনো ক্যাটাগরি তৈরি করা হয়নি' : 'No task categories yet'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                StorageService.resetTaskCategoriesToDefault(activeShopId);
                loadCategories();
              }}
              className="px-3 py-1.5 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] text-[#007F73] dark:text-teal-300 rounded-xl font-bold transition text-xs"
            >
              {lang === 'bn' ? 'ডিফল্ট ক্যাটাগরি লোড' : 'Load Defaults'}
            </button>
            {isMaster && (
              <button
                onClick={() => {
                  setShowCategoryModal(true);
                  setCatError('');
                }}
                className="px-3 py-1.5 bg-[#007F73] text-white rounded-xl font-bold transition text-xs"
              >
                {lang === 'bn' ? '+ নতুন ক্যাটাগরি' : '+ Add Category'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {/* All Tasks Pill */}
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3.5 py-2 rounded-xl font-medium transition whitespace-nowrap min-h-[36px] flex items-center gap-1.5 ${
              filterCategory === 'all'
                ? 'bg-[#007F73] text-white font-bold shadow-xs'
                : 'bg-white dark:bg-[#14201C] text-[#626E6A] dark:text-stone-300 border border-[#DCE4E1] dark:border-[#1E302B] hover:bg-[#F0F4F2] dark:hover:bg-[#162420]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'সকল কাজ' : 'All Tasks'}</span>
            <span className="text-[10px] opacity-80 font-mono">({tasks.length})</span>
          </button>

          {/* Dynamic Category Pills with color dot */}
          {taskCategories.map(cat => {
            const count = tasks.filter(t => t.category === cat.id).length;
            const isSelected = filterCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl font-medium transition whitespace-nowrap min-h-[36px] flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#007F73] text-white font-bold shadow-xs'
                    : 'bg-white dark:bg-[#14201C] text-[#626E6A] dark:text-stone-300 border border-[#DCE4E1] dark:border-[#1E302B] hover:bg-[#F0F4F2] dark:hover:bg-[#162420]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color || '#007F73' }}
                />
                <span>{lang === 'bn' ? cat.nameBn || cat.name : cat.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}

          {/* Master Admin Category Shortcut & Quick Add */}
          {isMaster && (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <button
                onClick={() => {
                  setShowCategoryModal(true);
                  setCatError('');
                }}
                title="Manage Categories"
                className="p-2 rounded-xl text-[#007F73] dark:text-teal-400 bg-white dark:bg-[#14201C] border border-dashed border-[#007F73]/50 hover:bg-[#007F73]/10 transition flex items-center gap-1 text-xs font-semibold"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{lang === 'bn' ? 'ক্যাটাগরি' : 'Categories'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Priority 2: Sample Tasks Banner & Cleanup Action */}
      {tasks.some(t => t.isDemo) && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">
                {lang === 'bn' ? 'নমুনা কাজ সক্রিয় রয়েছে' : 'Sample Tasks Active'}
              </span>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                {lang === 'bn'
                  ? 'আপনার নিজস্ব কাজ বজায় রেখে যেকোনো সময় নমুনা কাজগুলো এক ক্লিকে মুছে ফেলতে পারেন।'
                  : 'You can remove sample tasks anytime without touching your custom tasks.'}
              </p>
            </div>
          </div>
          {isMaster && (
            <button
              onClick={() => setShowRemoveDemoConfirm(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
            >
              {lang === 'bn' ? 'নমুনা কাজগুলো মুছুন' : 'Remove Sample Tasks'}
            </button>
          )}
        </div>
      )}

      {/* Task Checklist Items */}
      {tasks.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-[#14201C] rounded-3xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#626E6A] dark:text-stone-400 text-xs shadow-xs space-y-3">
          <CheckSquare className="w-10 h-10 text-[#007F73]/40 mx-auto" />
          <p className="font-bold text-[#17211F] dark:text-stone-100 text-sm">
            {lang === 'bn' ? 'কোনো চেকলিস্ট কাজ নেই' : 'No checklist tasks yet'}
          </p>
          <p className="max-w-xs mx-auto text-stone-500 dark:text-stone-400 text-xs">
            {lang === 'bn'
              ? 'নতুন কাজ যোগ করুন অথবা মিষ্টির দোকানের আদর্শ চেকলিস্ট কাজগুলো এক ক্লিকে লোড করুন।'
              : 'Add tasks manually or load suggested daily sweet shop tasks.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              onClick={handleLoadSuggestedTasks}
              className="px-4 py-2 bg-[#007F73]/15 hover:bg-[#007F73]/25 text-[#007F73] dark:text-teal-300 rounded-xl font-bold transition flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{lang === 'bn' ? 'প্রস্তাবিত দৈনিক কাজ লোড করুন' : 'Load suggested daily tasks'}</span>
            </button>
            {isMaster && (
              <button
                onClick={() => {
                  if (taskCategories.length > 0) setCategory(taskCategories[0].id);
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl font-semibold transition shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'bn' ? 'কাজ যোগ করুন' : 'Add Task'}</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-[#14201C] rounded-3xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#626E6A] dark:text-stone-400 text-xs shadow-xs">
          <p>{lang === 'bn' ? 'এই ক্যাটাগরিতে কোনো কাজ নেই' : 'No tasks in this category'}</p>
          {isMaster && (
            <button
              onClick={() => {
                if (filterCategory !== 'all') {
                  setCategory(filterCategory);
                } else if (taskCategories.length > 0) {
                  setCategory(taskCategories[0].id);
                }
                setShowAddModal(true);
              }}
              className="mt-3 px-4 py-2 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl font-semibold transition shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'bn' ? 'কাজ যোগ করুন' : 'Add Task'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#14201C] rounded-2xl border border-[#DCE4E1] dark:border-[#1E302B] divide-y divide-[#DCE4E1] dark:divide-[#1E302B] overflow-hidden shadow-xs">
          {filteredTasks.map(task => {
            return (
              <div
                key={task.id}
                onClick={() => handleToggle(task.id)}
                className={`p-3.5 flex items-center justify-between gap-3 hover:bg-[#F0F4F2]/80 dark:hover:bg-[#162420] cursor-pointer transition select-none ${
                  task.isCompleted ? 'bg-[#F0F4F2]/50 dark:bg-[#101A17]/60 opacity-80' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    className="shrink-0 text-[#007F73] dark:text-teal-400"
                    aria-label={task.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.isCompleted ? (
                      <CheckSquare className="w-5 h-5 fill-[#007F73]/15 text-[#007F73] dark:text-teal-400" />
                    ) : (
                      <Square className="w-5 h-5 text-[#626E6A]/50 dark:text-stone-600" />
                    )}
                  </button>
                  <div className="truncate">
                    <p
                      className={`text-xs font-semibold truncate ${
                        task.isCompleted
                          ? 'line-through text-[#626E6A] dark:text-stone-500'
                          : 'text-[#17211F] dark:text-stone-100'
                      }`}
                    >
                      {lang === 'bn' ? task.titleBn || task.title : task.title}
                    </p>
                    {task.titleBn && task.titleBn !== task.title && (
                      <p
                        className={`text-[10px] truncate ${
                          task.isCompleted
                            ? 'line-through text-[#626E6A]/70 dark:text-stone-600'
                            : 'text-[#626E6A] dark:text-stone-400'
                        }`}
                      >
                        {task.title}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#F0F4F2] dark:bg-[#162420] text-[#007F73] dark:text-teal-300 border border-[#DCE4E1] dark:border-[#1E322C]">
                    {getCategoryLabel(task.category)}
                  </span>

                  {task.isDemo && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                      {lang === 'bn' ? 'নমুনা' : 'Sample'}
                    </span>
                  )}

                  {task.dueDate && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-[#626E6A] dark:text-stone-400">
                      <Clock className="w-3 h-3 text-[#007F73]" />
                      <span>{task.dueDate}</span>
                    </span>
                  )}

                  {isMaster && (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask(task);
                          setEditTitleEn(task.title);
                          setEditTitleBn(task.titleBn || task.title);
                          setEditCategory(task.category);
                          setEditDueTime(task.dueDate || '');
                        }}
                        className="p-1.5 text-[#626E6A] dark:text-stone-400 hover:text-[#007F73] dark:hover:text-teal-300 hover:bg-[#F0F4F2] dark:hover:bg-[#162420] rounded-lg transition"
                        title="Edit task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setTaskToDelete(task)}
                        className="p-1.5 text-[#626E6A] dark:text-stone-400 hover:text-[#DC2626] dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. MANAGE CATEGORIES MODAL (Master Admin) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE4E1] dark:border-[#1E302B] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#007F73]/15 text-[#007F73] dark:bg-teal-500/20 dark:text-teal-300 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17211F] dark:text-stone-100">
                    {lang === 'bn' ? 'কাজের ক্যাটাগরি ব্যবস্থাপনা' : 'Manage Task Categories'}
                  </h3>
                  <p className="text-[11px] text-[#626E6A] dark:text-stone-400">
                    {lang === 'bn'
                      ? 'ক্যাটাগরি যোগ করুন, নাম পরিবর্তন করুন অথবা মুছে ফেলুন'
                      : 'Add, rename, or delete checklist categories for this branch'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCatId(null);
                  setCatError('');
                }}
                className="p-1.5 text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {catError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{catError}</span>
              </div>
            )}

            {/* Existing Categories List */}
            <div className="space-y-2 mb-5 max-h-60 overflow-y-auto pr-1">
              <label className="block text-[11px] font-semibold text-[#626E6A] dark:text-stone-400 uppercase tracking-wider">
                {lang === 'bn' ? 'বর্তমান ক্যাটাগরিসমূহ' : 'Current Categories'} ({taskCategories.length})
              </label>

              {taskCategories.map(cat => {
                const isEditing = editingCatId === cat.id;
                const taskCount = tasks.filter(t => t.category === cat.id).length;

                return (
                  <div
                    key={cat.id}
                    className="p-3 bg-[#F0F4F2]/50 dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={editCatNameEn}
                            onChange={e => setEditCatNameEn(e.target.value)}
                            placeholder="English name"
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-[#162420] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs text-[#17211F] dark:text-stone-100 outline-none focus:border-[#007F73]"
                          />
                          <input
                            type="text"
                            value={editCatNameBn}
                            onChange={e => setEditCatNameBn(e.target.value)}
                            placeholder="বাংলা নাম"
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-[#162420] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs text-[#17211F] dark:text-stone-100 outline-none focus:border-[#007F73]"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] text-[#626E6A] dark:text-stone-400 font-semibold">{lang === 'bn' ? 'রং:' : 'Color:'}</span>
                          {['#007F73', '#D97706', '#2563EB', '#7C3AED', '#E11D48', '#059669'].map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditCatColor(c)}
                              className={`w-4 h-4 rounded-full transition-transform ${editCatColor === c ? 'ring-2 ring-offset-1 ring-black dark:ring-white scale-125' : 'opacity-70 hover:opacity-100'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color || '#007F73' }}
                          />
                          <span className="text-xs font-bold text-[#17211F] dark:text-stone-100">
                            {cat.name}
                          </span>
                          {cat.nameBn && cat.nameBn !== cat.name && (
                            <span className="text-xs text-[#626E6A] dark:text-stone-400 font-medium">
                              ({cat.nameBn})
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-[#162420] border border-[#DCE4E1] dark:border-[#1E322C] text-[#007F73] dark:text-teal-300 font-mono">
                            {taskCount} {lang === 'bn' ? 'টি কাজ' : 'tasks'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 justify-end">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveRenameCategory(cat.id)}
                            className="p-1.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-lg transition"
                            title="Save Rename"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="p-1.5 bg-[#F0F4F2] dark:bg-[#162420] text-[#626E6A] dark:text-stone-400 rounded-lg hover:text-[#17211F] transition"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(cat)}
                            className="p-1.5 text-[#626E6A] dark:text-stone-400 hover:text-[#007F73] dark:hover:text-teal-300 hover:bg-white dark:hover:bg-[#162420] rounded-lg transition"
                            title="Edit Category Name & Color"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInitiateDeleteCategory(cat)}
                            className="p-1.5 text-[#626E6A] dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add New Category Row */}
            <form onSubmit={handleAddNewCategory} className="pt-3 border-t border-[#DCE4E1] dark:border-[#1E302B]">
              <label className="block text-[11px] font-semibold text-[#17211F] dark:text-stone-200 mb-2">
                {lang === 'bn' ? '+ নতুন ক্যাটাগরি তৈরি করুন' : '+ Add New Category'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
                <input
                  type="text"
                  required
                  value={newCatNameEn}
                  onChange={e => setNewCatNameEn(e.target.value)}
                  placeholder="English (e.g. Packing & Boxes)"
                  className="px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A] dark:placeholder-stone-500"
                />
                <input
                  type="text"
                  value={newCatNameBn}
                  onChange={e => setNewCatNameBn(e.target.value)}
                  placeholder="বাংলা (যেমন: প্যাকেট ও ডেলিভারি)"
                  className="px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A] dark:placeholder-stone-500"
                />
              </div>

              {/* Color picker */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] text-[#626E6A] dark:text-stone-400 font-semibold">
                  {lang === 'bn' ? 'রং নির্বাচন:' : 'Color:'}
                </span>
                <div className="flex items-center gap-1.5">
                  {['#007F73', '#D97706', '#2563EB', '#7C3AED', '#E11D48', '#059669'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCatColor(c)}
                      className={`w-5 h-5 rounded-full transition-transform ${newCatColor === c ? 'ring-2 ring-offset-1 ring-black dark:ring-white scale-125' : 'opacity-70 hover:opacity-100'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2.5 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold min-h-[38px]"
                >
                  {lang === 'bn' ? 'সম্পন্ন' : 'Done'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 min-h-[38px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'যোগ করুন' : 'Add Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CATEGORY DELETION WITH TASKS SAFETY MODAL */}
      {catToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-center text-[#17211F] dark:text-stone-100">
              {lang === 'bn'
                ? `"${catToDelete.category.nameBn || catToDelete.category.name}" ক্যাটাগরিতে ${catToDelete.taskCount}টি কাজ রয়েছে`
                : `"${catToDelete.category.name}" has ${catToDelete.taskCount} active task(s)`}
            </h3>

            <p className="text-xs text-center text-[#626E6A] dark:text-stone-400 mt-2 mb-4">
              {lang === 'bn'
                ? 'ক্যাটাগরি মুছে ফেলার আগে এই কাজগুলোর জন্য একটি ব্যবস্থা নির্বাচন করুন:'
                : 'Before deleting this category, choose how to handle the existing tasks:'}
            </p>

            <div className="space-y-3 mb-5">
              {/* Option A: Reallocate to another category (if other categories exist) */}
              {taskCategories.filter(c => c.id !== catToDelete.category.id).length > 0 && (
                <div className="p-3.5 bg-[#F0F4F2] dark:bg-[#101A17] rounded-2xl border border-[#DCE4E1] dark:border-[#1E302B]">
                  <p className="text-xs font-bold text-[#17211F] dark:text-stone-100 mb-2">
                    {lang === 'bn'
                      ? '১. কাজগুলো অন্য ক্যাটাগরিতে স্থানান্তর করুন:'
                      : '1. Reallocate tasks to another category:'}
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={reallocateTargetId}
                      onChange={e => setReallocateTargetId(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-[#14201C] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-medium text-[#17211F] dark:text-stone-100 outline-none"
                    >
                      {taskCategories
                        .filter(c => c.id !== catToDelete.category.id)
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {lang === 'bn' ? c.nameBn || c.name : c.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleExecuteCategoryDeleteWithAction('reallocate')}
                      disabled={!reallocateTargetId}
                      className="px-4 py-2 bg-[#007F73] hover:bg-[#00685E] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                    >
                      {lang === 'bn' ? 'স্থানান্তর ও ডিলিট' : 'Move & Delete'}
                    </button>
                  </div>
                </div>
              )}

              {/* Option B: Delete tasks along with category */}
              <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-rose-700 dark:text-rose-400">
                    {taskCategories.filter(c => c.id !== catToDelete.category.id).length > 0
                      ? (lang === 'bn' ? '২. এই ক্যাটাগরির সকল কাজ মুছে ফেলুন' : '2. Delete all tasks in this category')
                      : (lang === 'bn' ? 'ক্যাটাগরি ও সকল কাজ মুছে ফেলুন' : 'Delete category and all its tasks')}
                  </p>
                  <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80">
                    {lang === 'bn' ? 'ক্যাটাগরি ও এর ভেতরের কাজগুলো চিরতরে মুছে যাবে' : 'Tasks cannot be recovered'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleExecuteCategoryDeleteWithAction('deleteTasks')}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shrink-0 shadow-xs"
                >
                  {lang === 'bn' ? 'সব মুছুন' : 'Delete All'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCatToDelete(null)}
              className="w-full py-2.5 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* 3. ADD TASK MODAL (Master Admin) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE4E1] dark:border-[#1E302B] mb-3">
              <h3 className="text-base font-bold text-[#17211F] dark:text-stone-100">
                {lang === 'bn' ? 'দোকানের নতুন কাজ যোগ করুন' : 'Add Sweet Shop Task'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {lang === 'bn' ? 'কাজের বিবরণ (বাংলা)' : 'Task Description (Bengali)'}
                </label>
                <input
                  type="text"
                  required
                  value={taskTitleBn}
                  onChange={e => setTaskTitleBn(e.target.value)}
                  placeholder="যেমন: বিকেলে মিষ্টির পার্সেল তৈরি ও পরিদর্শন"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A] dark:placeholder-stone-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {lang === 'bn' ? 'কাজের বিবরণ (ইংরেজি)' : 'Task Description (English)'}
                </label>
                <input
                  type="text"
                  required
                  value={taskTitleEn}
                  onChange={e => setTaskTitleEn(e.target.value)}
                  placeholder="e.g. Inspect afternoon delivery boxes"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] text-[#17211F] dark:text-stone-100 placeholder-[#626E6A] dark:placeholder-stone-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                    {lang === 'bn' ? 'ধরণ (ক্যাটাগরি)' : 'Category'}
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-medium outline-none text-[#17211F] dark:text-stone-100"
                  >
                    {taskCategories.map(c => (
                      <option key={c.id} value={c.id}>
                        {lang === 'bn' ? c.nameBn || c.name : c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                    {lang === 'bn' ? 'সময়' : 'Due Time'}
                  </label>
                  <input
                    type="text"
                    value={dueTime}
                    onChange={e => setDueTime(e.target.value)}
                    placeholder="12:00 PM"
                    className="w-full px-3 py-2 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-medium outline-none text-[#17211F] dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {lang === 'bn' ? 'সংরক্ষণ' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. EDIT TASK MODAL (Master Admin) */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-[#17211F] dark:text-stone-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE4E1] dark:border-[#1E302B] mb-3">
              <h3 className="text-base font-bold text-[#007F73] dark:text-teal-400 flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-[#007F73]" />
                <span>{lang === 'bn' ? 'কাজ সম্পাদনা করুন' : 'Edit Operation Task'}</span>
              </h3>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1.5 text-[#626E6A] dark:text-stone-400 hover:text-[#17211F] dark:hover:text-stone-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {lang === 'bn' ? 'কাজের বিবরণ (বাংলা)' : 'Task Description (Bengali)'}
                </label>
                <input
                  type="text"
                  required
                  value={editTitleBn}
                  onChange={e => setEditTitleBn(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] text-[#17211F] dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                  {lang === 'bn' ? 'কাজের বিবরণ (ইংরেজি)' : 'Task Description (English)'}
                </label>
                <input
                  type="text"
                  required
                  value={editTitleEn}
                  onChange={e => setEditTitleEn(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#007F73]/20 focus:border-[#007F73] text-[#17211F] dark:text-stone-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                    {lang === 'bn' ? 'ধরণ (ক্যাটাগরি)' : 'Category'}
                  </label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-medium outline-none text-[#17211F] dark:text-stone-100"
                  >
                    {taskCategories.map(c => (
                      <option key={c.id} value={c.id}>
                        {lang === 'bn' ? c.nameBn || c.name : c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17211F] dark:text-stone-200 mb-1">
                    {lang === 'bn' ? 'সময়' : 'Due Time'}
                  </label>
                  <input
                    type="text"
                    value={editDueTime}
                    onChange={e => setEditDueTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#101A17] border border-[#DCE4E1] dark:border-[#1E302B] rounded-xl text-xs font-medium outline-none text-[#17211F] dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="flex-1 py-2.5 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#007F73] hover:bg-[#00685E] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'আপডেট করুন' : 'Update Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. DELETE TASK CONFIRMATION MODAL */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#14201C] rounded-3xl p-6 shadow-2xl border border-[#DCE4E1] dark:border-[#1E302B] text-center text-[#17211F] dark:text-stone-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#17211F] dark:text-stone-100">
              {lang === 'bn' ? 'কাজটি মুছে ফেলতে চান?' : 'Delete This Task?'}
            </h3>
            <p className="text-xs text-[#626E6A] dark:text-stone-400 mt-1 mb-4">
              "{lang === 'bn' ? taskToDelete.titleBn || taskToDelete.title : taskToDelete.title}"
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="flex-1 py-2.5 bg-[#F0F4F2] hover:bg-[#E4ECE9] dark:bg-[#162420] dark:hover:bg-[#1E322C] text-[#17211F] dark:text-stone-200 border border-[#DCE4E1] dark:border-[#1E322C] rounded-xl text-xs font-semibold"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Checklist Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title={lang === 'bn' ? 'চেকলিস্ট রিসেট' : 'Reset Checklist'}
        message={
          lang === 'bn'
            ? 'আপনি কি নিশ্চিত যে সকল কাজ ও ক্যাটাগরি ডিফল্ট মিষ্টির দোকানের তালিকায় রিসেট করতে চান?'
            : 'Reset all tasks and ensure standard categories on this sweet shop checklist?'
        }
        isDanger={true}
        confirmText={lang === 'bn' ? 'রিসেট করুন' : 'Reset'}
        cancelText={lang === 'bn' ? 'বাতিল' : 'Cancel'}
        onConfirm={executeResetChecklist}
        onCancel={() => setShowResetConfirm(false)}
        lang={lang}
      />

      {/* Remove Demo Tasks Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRemoveDemoConfirm}
        title={lang === 'bn' ? 'নমুনা কাজগুলো মুছে ফেলুন' : 'Remove Sample Tasks'}
        message={
          lang === 'bn'
            ? 'আপনি কি নিশ্চিত যে সব নমুনা চেকলিস্ট কাজ মুছে ফেলতে চান? আপনার তৈরি নিজস্ব কাজগুলো অপরিবর্তিত থাকবে।'
            : 'Are you sure you want to remove all sample checklist tasks? Your custom tasks will not be affected.'
        }
        confirmText={lang === 'bn' ? 'মুছে ফেলুন' : 'Remove'}
        cancelText={lang === 'bn' ? 'বাতিল' : 'Cancel'}
        isDanger={true}
        onConfirm={handleRemoveDemoTasks}
        onCancel={() => setShowRemoveDemoConfirm(false)}
        lang={lang}
      />

      {/* Category Notice Alert Dialog */}
      <ConfirmDialog
        isOpen={!!catAlertMsg}
        title={lang === 'bn' ? 'সতর্কতা' : 'Notice'}
        message={catAlertMsg || ''}
        confirmText={lang === 'bn' ? 'ঠিক আছে' : 'OK'}
        cancelText={lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
        onConfirm={() => setCatAlertMsg(null)}
        onCancel={() => setCatAlertMsg(null)}
        lang={lang}
      />
    </div>
  );
};
