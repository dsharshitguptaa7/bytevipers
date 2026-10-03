import React from "react";
import Image from "next/image";

interface ByteVipersLogoProps {
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  showText?: boolean;
  size?: number;
  priority?: boolean;
}

export function ByteVipersLogo({
  className = "",
  imageClassName = "",
  textClassName = "text-xl font-extrabold",
  showText = true,
  size = 38,
  priority = true,
}: ByteVipersLogoProps) {
  return (
    <div className={`flex items-center gap-3 group cursor-pointer select-none ${className}`}>
      {/* Official ByteVipers Logo Circular Emblem */}
      <div className={`relative flex items-center justify-center shrink-0 rounded-full transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_18px_rgba(245,189,69,0.35)] ${imageClassName}`}>
        <Image
          src="/ByteVipers.png"
          alt="ByteVipers Logo"
          width={size}
          height={size}
          priority={priority}
          className="rounded-full object-contain"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`tracking-tight font-black font-mono leading-none text-[#F5F7FA] ${textClassName}`}>
            BYTE<span className="text-[#168BFF] group-hover:text-[#36C5FF] transition-colors">VIPERS</span>
          </span>
          <span className="text-[10px] tracking-widest text-[#F5BD45] font-bold uppercase mt-0.5">
            Coding Arena
          </span>
        </div>
      )}
    </div>
  );
}

export default ByteVipersLogo;
