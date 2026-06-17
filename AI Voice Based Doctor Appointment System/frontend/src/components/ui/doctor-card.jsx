import { motion, useReducedMotion } from "framer-motion";
import { Check, Video, Star, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";

export function DoctorCard({
  doctor,
  onBook = () => {},
  className,
  enableAnimations = true,
  hideBookButton = false,
}) {
  const [hovered, setHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;

  const name = doctor.user?.name?.startsWith('Dr.') ? doctor.user.name : `Dr. ${doctor.user?.name || 'Unknown'}`;
  const description = doctor.specialization?.name || 'Specialist';
  const isVerified = true;
  const fee = doctor.fee || '150';
  
  // Array of modern medical/abstract backgrounds
  const backgrounds = [
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=800&fit=crop&q=80",
    "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=800&fit=crop&q=80",
    "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=800&h=800&fit=crop&q=80",
    "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&h=800&fit=crop&q=80",
    "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&h=800&fit=crop&q=80"
  ];
  // Stable pseudo-random pick based on name
  const bgIndex = (doctor.user?.name?.length || 0) % backgrounds.length;
  const image = backgrounds[bgIndex];

  const containerVariants = {
    rest: { 
      scale: 1,
      y: 0,
      filter: "blur(0px)",
    },
    hover: shouldAnimate ? { 
      scale: 1.02, 
      y: -4,
      filter: "blur(0px)",
      transition: { 
        type: "spring", 
        stiffness: 400, 
        damping: 28,
        mass: 0.6,
      }
    } : {},
  };

  const imageVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
  };

  const contentVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      filter: "blur(4px)",
    },
    visible: { 
      opacity: 1, 
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 28,
        mass: 0.6,
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 15,
      scale: 0.95,
      filter: "blur(2px)",
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.5,
      },
    },
  };

  const letterVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        damping: 8,
        stiffness: 200,
        mass: 0.8,
      },
    },
  };

  return (
    <motion.div
      data-slot="profile-hover-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial="rest"
      whileHover="hover"
      variants={containerVariants}
      className={cn(
        "relative w-full h-[360px] sm:h-[400px] rounded-3xl border border-slate-200 bg-white text-slate-900 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-black/5 cursor-pointer group",
        className
      )}
    >
      {/* Top Cover Image */}
      <div className="absolute top-0 left-0 right-0 h-48 overflow-hidden">
        <motion.img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
          variants={imageVariants}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        {/* Soft fade into the white card below */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
      </div>

      {/* Content Container (Bottom portion) */}
      <motion.div 
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        className="absolute bottom-0 left-0 right-0 p-6 bg-white"
      >
        <motion.div variants={itemVariants} className="flex flex-col gap-3 -mt-16">
           <div className="relative w-16 h-16">
             <div className="absolute inset-0 bg-white rounded-full"></div>
             <img 
                src={`https://api.dicebear.com/7.x/initials/svg?seed=Dr${doctor.user?.name || 'Doctor'}&backgroundColor=f8fafc`} 
                alt="Doctor" 
                className="relative w-16 h-16 rounded-full border-4 border-white object-cover shadow-sm bg-slate-50"
              />
           </div>
           
           <div>
            {/* Name and Verification */}
            <div className="flex items-center gap-2">
              <motion.h2 
                className="text-xl font-black text-slate-900 tracking-tight flex flex-wrap"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.02,
                    }
                  }
                }}
              >
                {name.split(" ").map((word, wordIndex) => (
                  <span key={wordIndex} className="inline-block whitespace-nowrap mr-1.5">
                    {word.split("").map((letter, letterIndex) => (
                      <motion.span
                        key={`${wordIndex}-${letterIndex}`}
                        variants={letterVariants}
                        className="inline-block"
                      >
                        {letter}
                      </motion.span>
                    ))}
                  </span>
                ))}
              </motion.h2>
              {isVerified && (
                <motion.div 
                  variants={itemVariants}
                  className="flex items-center justify-center w-4 h-4 rounded-full bg-health-500 text-white shadow-sm"
                  whileHover={{ 
                    scale: 1.1, 
                    rotate: 5,
                    transition: { type: "spring", stiffness: 400, damping: 20 }
                  }}
                >
                  <Check className="w-2.5 h-2.5" />
                </motion.div>
              )}
            </div>
            {/* Description */}
            <motion.p 
              variants={itemVariants}
              className="text-slate-500 text-sm font-bold mt-1"
            >
              {description}
            </motion.p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div 
          variants={itemVariants}
          className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100"
        >
          <div className="flex items-center gap-1.5 text-amber-500">
            <Star className="w-4 h-4 fill-amber-500" />
            <span className="font-bold text-slate-900">4.9</span>
            <span className="text-slate-400 text-sm font-medium">(120+ reviews)</span>
          </div>
          <div className="text-right">
            <span className="font-black text-health-600 text-xl">${fee}</span>
          </div>
        </motion.div>

        {!hideBookButton && (
          <motion.button
            variants={itemVariants}
            onClick={(e) => {
               e.stopPropagation();
               onBook();
            }}
            whileHover={{ 
              scale: 1.02,
              transition: { type: "spring", stiffness: 400, damping: 25 }
            }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "w-full cursor-pointer py-3.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 mt-4",
              "bg-slate-900 text-white hover:bg-health-600 flex items-center justify-center gap-2 shadow-md",
              "transform-gpu"
            )}
          >
            <Video className="w-4 h-4" /> Book Consultation
          </motion.button>
        )}

      </motion.div>
    </motion.div>
  );
}
