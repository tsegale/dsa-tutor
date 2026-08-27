import CanvasContainer from '@/components/canvas/CanvasContainer'
import PseudocodePanel from '@/components/canvas/PseudocodePanel'
import ExplanationPanel from '@/components/canvas/ExplanationPanel'
import ComplexityPanel from '@/components/canvas/ComplexityPanel'
import ProgressBar from '@/components/ui/ProgressBar'
import ModeToggle from '@/components/ui/ModeToggle'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'

export default function CanvasTest() {
  const stepForward = useAlgorithmStore((state) => state.stepForward)
  const stepBackward = useAlgorithmStore((state) => state.stepBackward)
  const resetAlgorithm = useAlgorithmStore((state) => state.resetAlgorithm)

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Canvas Test</h1>
        <ModeToggle />
      </div>

      <ProgressBar />

      <div className="h-[360px] w-[60%]">
        <CanvasContainer />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={stepBackward}>
          Previous Step
        </Button>
        <Button onClick={stepForward}>Next Step</Button>
        <Button variant="outline" onClick={resetAlgorithm}>
          Reset
        </Button>
      </div>

      <Tabs defaultValue="explanation">
        <TabsList>
          <TabsTrigger value="explanation">Explanation</TabsTrigger>
          <TabsTrigger value="pseudocode">Pseudocode</TabsTrigger>
          <TabsTrigger value="complexity">Complexity</TabsTrigger>
        </TabsList>
        <TabsContent value="explanation">
          <ExplanationPanel />
        </TabsContent>
        <TabsContent value="pseudocode">
          <PseudocodePanel />
        </TabsContent>
        <TabsContent value="complexity">
          <ComplexityPanel />
        </TabsContent>
      </Tabs>
    </main>
  )
}
