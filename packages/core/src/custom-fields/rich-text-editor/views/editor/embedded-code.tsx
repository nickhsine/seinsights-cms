import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { AtomicBlockUtils, DraftEntityInstance, EditorState } from 'draft-js'
import { Drawer, DrawerController } from '@keystone-ui/modals'
import { TextInput, TextArea } from '@keystone-ui/fields'

export const Block = styled.div`
  position: relative;
  /* styles for image link */
  img.img-responsive {
    margin: 0 auto;
    max-width: 100%;
    height: auto;
    display: block;
  }
`

export const Caption = styled.div`
  line-height: 1.43;
  letter-spacing: 0.4px;
  font-size: 14px;
  color: #808080;
  padding: 15px 15px 0 15px;
`

export const EmbeddedCodeBlock = (entity: DraftEntityInstance) => {
  const { caption, embeddedCode } = entity.getData()
  const embedded = useRef(null)

  useEffect(() => {
    const node = embedded.current
    const fragment = document.createDocumentFragment()

    // `embeddedCode` is a string, which may includes
    // multiple '<script>' tags and other html tags.
    // For executing '<script>' tags on the browser,
    // we need to extract '<script>' tags from `embeddedCode` string first.
    //
    // The approach we have here is to parse html string into elements,
    // and we could use DOM element built-in functions,
    // such as `querySelectorAll` method, to query '<script>' elements,
    // and other non '<script>' elements.
    const parser = new DOMParser()
    const ele = parser.parseFromString(
      `<div id="draft-embed">${embeddedCode}</div>`,
      'text/html'
    )
    const scripts = ele.querySelectorAll('script')
    const nonScripts = ele.querySelectorAll('div#draft-embed > :not(script)')

    nonScripts.forEach((ele) => {
      fragment.appendChild(ele)
    })

    scripts.forEach((s) => {
      const scriptEle = document.createElement('script')
      const attrs = s.attributes
      for (let i = 0; i < attrs.length; i++) {
        scriptEle.setAttribute(attrs[i].name, attrs[i].value)
      }
      scriptEle.text = s.text || ''
      fragment.appendChild(scriptEle)
    })

    node.appendChild(fragment)
  }, [embeddedCode])

  return (
    <div>
      {
        // WORKAROUND:
        // The following `<input>` is to solve [issue 153](https://github.com/mirror-media/openwarehouse-k6/issues/153).
        // If the emebed code generates `<input>` or `<textarea>` and appends them onto DOM,
        // and then the generated `<input>` or `<textarea>` will hijack the users' cursors.
        // It will cause that users could not edit the DraftJS Editor anymore.
        // The following phony `<input>` is used to prevent the generated `<input>` or `<textare>` from
        // hijacking the users' cursors.
      }
      <input hidden disabled />
      <Block ref={embedded} />
      {caption ? <Caption>{caption}</Caption> : null}
    </div>
  )
}

export function EmbeddedCodeButton(props) {
  const { editorState, onChange, className } = props

  const [toShowInput, setToShowInput] = useState(false)
  const [inputValue, setInputValue] = useState({
    caption: '',
    embeddedCode: '',
  })

  const promptForInput = () => {
    setToShowInput(true)
    setInputValue({
      caption: '',
      embeddedCode: '',
    })
  }

  const confirmInput = () => {
    const contentState = editorState.getCurrentContent()
    const contentStateWithEntity = contentState.createEntity(
      'EMBEDDEDCODE',
      'IMMUTABLE',
      inputValue
    )
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey()
    const newEditorState = EditorState.set(editorState, {
      currentContent: contentStateWithEntity,
    })

    // The third parameter here is a space string, not an empty string
    // If you set an empty string, you will get an error: Unknown DraftEntity key: null
    onChange(AtomicBlockUtils.insertAtomicBlock(newEditorState, entityKey, ' '))

    setToShowInput(false)
    setInputValue({
      caption: '',
      embeddedCode: '',
    })
  }

  const input = (
    <DrawerController isOpen={toShowInput}>
      <Drawer
        title={`Insert Embedded Code`}
        //isOpen={toShowInput}
        actions={{
          cancel: {
            label: 'Cancel',
            action: () => {
              setToShowInput(false)
            },
          },
          confirm: {
            label: 'Confirm',
            action: confirmInput,
          },
        }}
      >
        <TextInput
          onChange={(e) =>
            setInputValue({
              caption: e.target.value,
              embeddedCode: inputValue.embeddedCode,
            })
          }
          type="text"
          placeholder="Caption"
          value={inputValue.caption}
          style={{ marginBottom: '10px', marginTop: '30px' }}
        />
        <TextArea
          onChange={(e) =>
            setInputValue({
              caption: inputValue.caption,
              embeddedCode: e.target.value,
            })
          }
          placeholder="Embedded Code"
          type="text"
          value={inputValue.embeddedCode}
          style={{ marginBottom: '30px' }}
        />
      </Drawer>
    </DrawerController>
  )

  return (
    <React.Fragment>
      {input}
      <div
        onClick={() => {
          promptForInput()
        }}
        className={className}
      >
        <i className="far"></i>
        <span>Embed</span>
      </div>
    </React.Fragment>
  )
}
