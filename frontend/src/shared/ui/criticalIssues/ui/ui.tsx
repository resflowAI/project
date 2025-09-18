// src/entities/critical-block/ui/index.tsx
'use client';

import React, { useState } from 'react';
import { CriticalBlockProps } from '../types';
import { Banner } from '../banner';
import { ModalList } from '../modalList';

export const CriticalBlock = (props: CriticalBlockProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Banner {...props} onOpen={() => setOpen(true)} />
      <ModalList {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
};
