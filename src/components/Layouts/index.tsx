import BaseLayout from './base'
import { ILayout } from './common/types'

const layoutContainers = {
  base: BaseLayout
  // if needed - add more layout containers here
}

interface ILayoutFactory extends ILayout {
  type: keyof typeof layoutContainers
}

function Layout({ children, pageTitle, type }: ILayoutFactory) {
  const Container = layoutContainers[type]

  return <Container pageTitle={pageTitle}>{children}</Container>
}

export default Layout
