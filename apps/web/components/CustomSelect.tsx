"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";

export interface CustomSelectOption {
  value: string;
  label: string;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  style?: React.CSSProperties;
  className?: string;
  emptyText?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "— เลือกรายการ —",
  disabled = false,
  searchable = true,
  searchPlaceholder = "พิมพ์เพื่อค้นหา...",
  style,
  className = "",
  emptyText = "ไม่พบข้อมูลที่ตรงกัน",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected option
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    const cleanQuery = query.startsWith("#") ? query.slice(1).trim() : query;

    return options.filter((opt) => {
      const label = opt.label.toLowerCase();
      const sub = opt.sub ? opt.sub.toLowerCase() : "";
      const val = opt.value.toLowerCase();
      return (
        label.includes(query) ||
        (cleanQuery && label.includes(cleanQuery)) ||
        sub.includes(query) ||
        val.includes(query)
      );
    });
  }, [options, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen, searchable]);

  // Keyboard navigation (Escape to close)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${className}`}
      style={{
        position: "relative",
        zIndex: isOpen ? 100 : 1,
        userSelect: "none",
        ...style,
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          background: "rgba(255, 255, 255, 0.04)",
          border: isOpen
            ? "1px solid var(--accent)"
            : "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "var(--radius-md)",
          padding: "9px 14px",
          color: selectedOption ? "#f5f5f7" : "var(--text-muted)",
          fontSize: 13,
          fontFamily: "var(--font-sans)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: isOpen ? "0 0 0 3px rgba(41, 151, 255, 0.25)" : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            textAlign: "left",
          }}
        >
          {selectedOption?.color && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: selectedOption.color,
                flexShrink: 0,
              }}
            />
          )}
          {selectedOption?.icon && (
            <span style={{ display: "inline-flex", flexShrink: 0, opacity: 0.8 }}>
              {selectedOption.icon}
            </span>
          )}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.sub && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginLeft: 4,
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
              }}
            >
              {selectedOption.sub}
            </span>
          )}
        </div>

        {/* Chevron Icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: "100%",
            width: "max-content",
            maxWidth: 380,
            zIndex: 1000,
            background: "#0f0f14",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: "var(--radius-md)",
            boxShadow:
              "0 18px 48px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(24px)",
            overflow: "hidden",
            animation: "fadeInDown 0.15s ease-out",
          }}
        >
          {/* Search Box if searchable */}
          {searchable && options.length > 5 && (
            <div
              style={{
                padding: "8px 10px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(255, 255, 255, 0.02)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 12,
                  fontFamily: "var(--font-sans)",
                  color: "#ffffff",
                  padding: "4px 0",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.4)",
                    cursor: "pointer",
                    padding: 2,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div
            style={{
              maxHeight: 240,
              overflowY: "auto",
              padding: "4px 0",
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: "16px 14px",
                  textAlign: "center",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "8px 14px",
                      fontSize: 13,
                      fontFamily: "var(--font-sans)",
                      color: isSelected ? "#ffffff" : "var(--text-primary)",
                      background: isSelected
                        ? "rgba(41, 151, 255, 0.16)"
                        : "transparent",
                      cursor: "pointer",
                      transition: "background 0.12s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background =
                          "rgba(255, 255, 255, 0.06)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {opt.color && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: opt.color,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      {opt.icon && (
                        <span
                          style={{
                            display: "inline-flex",
                            flexShrink: 0,
                            opacity: 0.8,
                          }}
                        >
                          {opt.icon}
                        </span>
                      )}
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: isSelected ? 500 : 400,
                        }}
                      >
                        {opt.label}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      {opt.sub && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {opt.sub}
                        </span>
                      )}
                      {isSelected && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
