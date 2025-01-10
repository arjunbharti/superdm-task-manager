import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import TasksContainer from "@/components/TasksContainer";

export default function Home() {
  return (
    <div className="">
      <MaxWidthWrapper>
        <TasksContainer />
      </MaxWidthWrapper>
    </div>
  );
}
