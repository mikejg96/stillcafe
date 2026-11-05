import { Cards } from './scenes/Cards'
import { Footer } from './scenes/Footer'
import { Info } from './scenes/Info'
import { Journey } from './scenes/Journey'
import { Loader } from './scenes/Loader'

/** Composition root: scenes in scroll order. The sequence-by-sequence spec is design/SPEC.md. */
export function App() {
  return (
    <>
      <Loader />
      <main>
        <Journey />
        <Cards />
        <Info />
      </main>
      <Footer />
    </>
  )
}
