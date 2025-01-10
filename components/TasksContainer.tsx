'use client';

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const TasksContainer = () => {
  const [selectedTab, setSelectedTab] = useState<string>('open');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const storedTab = localStorage.getItem('selectedTab');
    if (storedTab) {
      setSelectedTab(storedTab);
    }
    setIsMounted(true);
  }, []);

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    localStorage.setItem('selectedTab', tab);
  }

  // preventing hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return null;
  }

  return (
    <Tabs value={selectedTab} onValueChange={handleTabChange} className="w-[400px] my-8">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="open">Open (4)</TabsTrigger>
        <TabsTrigger value="in-progress">In-progress (2)</TabsTrigger>
        <TabsTrigger value="closed">Closed (1)</TabsTrigger>
      </TabsList>
      <TabsContent value="open">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">open issues</h1>
        </div>
      </TabsContent>
      <TabsContent value="in-progress">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">in-progress issues</h1>
        </div>
      </TabsContent>
      <TabsContent value="closed">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">closed issues</h1>
        </div>
      </TabsContent>
    </Tabs>
  )
}

export default TasksContainer;