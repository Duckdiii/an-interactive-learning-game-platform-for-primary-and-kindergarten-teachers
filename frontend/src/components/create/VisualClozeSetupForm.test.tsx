import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import VisualClozeSetupForm, { type VisualClozeImageOptionInput } from './VisualClozeSetupForm'

function setup() {
  const onCreate = vi.fn()
  const onCancel = vi.fn()
  const view = render(
    <VisualClozeSetupForm
      mode="IMAGE"
      sceneImageUrl=""
      optionImages={[
        { imageUrl: '', visualPrompt: '' },
        { imageUrl: '', visualPrompt: '' },
      ]}
      onModeChange={vi.fn()}
      onSceneImageUrlChange={vi.fn()}
      onOptionImagesChange={vi.fn<(options: VisualClozeImageOptionInput[]) => void>()}
      onCreate={onCreate}
      onCancel={onCancel}
    />,
  )

  return { ...view, onCreate, onCancel }
}

describe('VisualClozeSetupForm', () => {
  it('shows the image scene and teacher supplied option fields', () => {
    setup()
    expect(screen.getByLabelText('URL ảnh cảnh')).toBeTruthy()
    expect(screen.getByLabelText('URL ảnh 1')).toBeTruthy()
    expect(screen.getByLabelText('Mô tả ảnh 2')).toBeTruthy()
    expect(screen.getByText(/Hệ thống không tạo ảnh/)).toBeTruthy()
  })

  it('keeps creation disabled until HTTPS scene and option URLs are provided', () => {
    const { rerender, onCreate } = setup()
    expect(screen.getByRole('button', { name: 'Tạo Visual Cloze' })).toBeDisabled()

    rerender(
      <VisualClozeSetupForm
        mode="IMAGE"
        sceneImageUrl="https://example.com/scene.png"
        optionImages={[
          { imageUrl: 'https://example.com/cat.png', visualPrompt: 'Mèo' },
          { imageUrl: 'https://example.com/dog.png', visualPrompt: 'Chó' },
        ]}
        onModeChange={vi.fn()}
        onSceneImageUrlChange={vi.fn()}
        onOptionImagesChange={vi.fn()}
        onCreate={onCreate}
        onCancel={vi.fn()}
      />,
    )

    const createButton = screen.getByRole('button', { name: 'Tạo Visual Cloze' })
    expect(createButton).toBeEnabled()
    fireEvent.click(createButton)
    expect(onCreate).toHaveBeenCalledOnce()
  })
})
