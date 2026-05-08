import { useState } from "react";
import { X, Plus, Upload, FileText, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Idea {
  id: number;
  title: string;
  color: string;
}

export function IdeasPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([
    { id: 1, title: "Concept Alpha", color: "from-orange-600 to-orange-700" },
    { id: 2, title: "Project Beta", color: "from-orange-500 to-orange-600" },
    { id: 3, title: "Innovation Gamma", color: "from-orange-600 to-red-600" },
    { id: 4, title: "Prototype Delta", color: "from-orange-700 to-orange-800" },
    { id: 5, title: "Experiment Epsilon", color: "from-red-600 to-orange-600" },
    { id: 6, title: "Research Zeta", color: "from-orange-500 to-orange-700" },
    { id: 7, title: "Concept Eta", color: "from-orange-600 to-red-700" },
    { id: 8, title: "Vision Theta", color: "from-orange-700 to-orange-600" },
  ]);

  const handleCardClick = (id: number) => {
    setExpandedId(id);
  };

  const handleClose = () => {
    setExpandedId(null);
  };

  const expandedIdea = ideas.find((idea) => idea.id === expandedId);

  return (
    <div className="h-full bg-black p-8 relative">
      {/* Grid of Ideas */}
      <div className="grid grid-cols-4 gap-6 max-w-7xl mx-auto">
        {ideas.map((idea) => (
          <motion.div
            key={idea.id}
            layoutId={`card-${idea.id}`}
            onClick={() => handleCardClick(idea.id)}
            className={`relative aspect-square rounded-2xl bg-gradient-to-br ${idea.color} cursor-pointer overflow-hidden group hover:scale-105 transition-transform`}
          >
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            <div className="absolute inset-0 p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                  #{idea.id.toString().padStart(2, '0')}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">{idea.title}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expanded View */}
      <AnimatePresence>
        {expandedId && expandedIdea && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            />

            {/* Expanded Card */}
            <motion.div
              layoutId={`card-${expandedId}`}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[85vh] rounded-2xl bg-gradient-to-br ${expandedIdea.color} z-50 overflow-hidden`}
            >
              <div className="absolute inset-0 bg-black/40" />
              
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-6 right-6 z-10 w-10 h-10 rounded-lg bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="relative h-full overflow-y-auto p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                  {/* Header */}
                  <div className="space-y-2">
                    <span className="text-sm font-bold text-white/60 uppercase tracking-wider">
                      #{expandedIdea.id.toString().padStart(2, '0')}
                    </span>
                    <input
                      type="text"
                      defaultValue={expandedIdea.title}
                      className="text-5xl font-bold text-white bg-transparent border-none outline-none w-full placeholder:text-white/50"
                      placeholder="Idea Title"
                    />
                  </div>

                  {/* Main Content Grid */}
                  <div className="grid grid-cols-2 gap-6 mt-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Notes Section */}
                      <div className="bg-black/30 rounded-xl p-6 border border-white/10">
                        <h4 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4">
                          Notes
                        </h4>
                        <textarea
                          className="w-full h-40 bg-white/5 border border-white/10 rounded-lg p-4 text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[#ff6b3d]"
                          placeholder="Write your thoughts here..."
                        />
                      </div>

                      {/* Description */}
                      <div className="bg-black/30 rounded-xl p-6 border border-white/10">
                        <h4 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4">
                          Description
                        </h4>
                        <textarea
                          className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-4 text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[#ff6b3d]"
                          placeholder="Describe your idea..."
                        />
                      </div>

                      {/* Quick Notes */}
                      <div className="bg-black/30 rounded-xl p-6 border border-white/10">
                        <h4 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4">
                          Quick Notes
                        </h4>
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <input
                              key={i}
                              type="text"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff6b3d]"
                              placeholder={`Note ${i}...`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      {/* Images Section */}
                      <div className="bg-black/30 rounded-xl p-6 border border-white/10">
                        <h4 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4">
                          Images
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {[1, 2].map((i) => (
                            <button
                              key={i}
                              className="aspect-video bg-white/5 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center hover:border-[#ff6b3d] hover:bg-white/10 transition-colors group"
                            >
                              <ImageIcon className="w-8 h-8 text-white/30 group-hover:text-[#ff6b3d] transition-colors" />
                              <span className="text-xs text-white/40 mt-2 group-hover:text-[#ff6b3d]">
                                Upload
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Documents Section */}
                      <div className="bg-black/30 rounded-xl p-6 border border-white/10">
                        <h4 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4">
                          Documents
                        </h4>
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <button
                              key={i}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex items-center gap-3 hover:border-[#ff6b3d] hover:bg-white/10 transition-colors group"
                            >
                              <FileText className="w-5 h-5 text-white/30 group-hover:text-[#ff6b3d]" />
                              <span className="text-sm text-white/40 group-hover:text-white">
                                Attach Document {i}
                              </span>
                              <Upload className="w-4 h-4 text-white/20 ml-auto group-hover:text-[#ff6b3d]" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="bg-black/30 rounded-xl p-6 border border-white/10">
                        <h4 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4">
                          Tags
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {["concept", "prototype", "research"].map((tag) => (
                            <span
                              key={tag}
                              className="px-3 py-1 bg-[#ff6b3d]/20 border border-[#ff6b3d]/50 rounded-full text-xs text-[#ff6b3d] font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                          <button className="px-3 py-1 bg-white/5 border border-white/20 rounded-full text-xs text-white/50 hover:border-[#ff6b3d] hover:text-[#ff6b3d] transition-colors">
                            <Plus className="w-3 h-3 inline" /> Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}