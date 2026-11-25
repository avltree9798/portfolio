const login = document.querySelector('#login')
const sharing = document.querySelector('#sharing')
const result = document.querySelector('#result')
const status = document.querySelector('#status')
function show(signedIn) {
  login.hidden = signedIn
  sharing.hidden = !signedIn
  result.hidden = true
  document.querySelector('#link').value = ''
  status.textContent = ''
}
async function api(path, data) {
  const response = await fetch(
    `/api/cv/${path}`,
    data === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
  )
  const body = await response.json()
  if (!response.ok) {
    if (response.status === 401) show(false)
    throw Error(body.error || 'Request failed. Please try again.')
  }
  return body
}
async function submit(form, action) {
  const button = form.querySelector('button')
  button.disabled = true
  status.textContent = ''
  try {
    await action()
  } catch (error) {
    status.textContent = error.message
  } finally {
    button.disabled = false
  }
}
login.addEventListener('submit', (event) => {
  event.preventDefault()
  submit(login, async () => {
    const password = document.querySelector('#password')
    const value = password.value
    password.value = ''
    await api('login', { password: value })
    show(true)
  })
})
document.querySelector('#generate').addEventListener('submit', (event) => {
  event.preventDefault()
  submit(event.currentTarget, async () => {
    const data = await api('link', {
      seconds: Number(document.querySelector('#expiry').value),
    })
    document.querySelector('#link').value = data.url
    document.querySelector('#expires').textContent =
      `Expires ${new Date(data.expiresAt).toLocaleString('en-GB')}`
    result.hidden = false
  })
})
document.querySelector('#logout').addEventListener('click', async () => {
  try {
    await api('logout', {})
    show(false)
  } catch (error) {
    status.textContent = error.message
  }
})
document.querySelector('#copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(document.querySelector('#link').value)
    status.textContent = 'Link copied.'
  } catch {
    document.querySelector('#link').select()
    status.textContent = 'Select and copy the link above.'
  }
})
api('session')
  .then((data) => show(data.signedIn))
  .catch(() => {
    show(false)
    status.textContent = 'Could not check sign-in. Please try signing in.'
  })
