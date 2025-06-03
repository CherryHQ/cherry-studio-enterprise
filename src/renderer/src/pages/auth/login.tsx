import { LinkOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import api, { updateApiBasePath, updateApiToken } from '@renderer/config/api'
import { AppLogo } from '@renderer/config/env'
import { useAuth } from '@renderer/hooks/useAuth'
import { useProvider } from '@renderer/hooks/useProvider'
import { useAppDispatch } from '@renderer/store'
import { setAccessToken, setServerUrl, setUser } from '@renderer/store/auth'
import { setUserName } from '@renderer/store/settings'
import { Button, Card, Form, Input } from 'antd'
import { FC, useState } from 'react'
import styled from 'styled-components'

import { syncConfig } from './sync'

interface LoginFormValues {
  username: string
  password: string
  serverUrl: string
}

const LoginPage: FC = () => {
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()
  const { provider, updateProvider } = useProvider('cherry-enterprise')
  const { serverUrl } = useAuth()

  const validateUrl = (_: any, value: string) => {
    try {
      if (!value) {
        return Promise.reject('请输入服务端地址')
      }
      const url = new URL(value.trim())
      if (!['http:', 'https:'].includes(url.protocol)) {
        return Promise.reject('请输入有效的 HTTP 或 HTTPS URL')
      }
      return Promise.resolve()
    } catch (error) {
      return Promise.reject('请输入有效的 URL 地址')
    }
  }

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true)

    try {
      const serverUrl = values.serverUrl.trim().replace(/\/+$/, '')

      // 设置服务端地址
      dispatch(setServerUrl(serverUrl))

      // 设置 API 基路径
      updateApiBasePath(serverUrl)

      const { data } = await api.authLogin({
        authLoginRequest: {
          username: values.username,
          password: values.password
        }
      })

      const { user, access_token } = data

      updateApiToken(access_token)
      updateProvider({ ...provider, apiHost: serverUrl, apiKey: user?.token?.token || '' })

      if (user && access_token) {
        dispatch(setUser(user))
        dispatch(setAccessToken(access_token))
        dispatch(setUserName(user.username))
      }

      syncConfig({ syncMcpServers: true })
    } catch (error: any) {
      console.error(error)
      window.message.error('登录失败，请联系管理员')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <LoginCard>
        <LogoContainer>
          <img src={AppLogo} alt="App Logo" />
          <BrandTitle>Cherry AI 企业版</BrandTitle>
        </LogoContainer>
        <Form name="login" initialValues={{ remember: true, serverUrl }} onFinish={onFinish} size="large">
          <Form.Item name="serverUrl" rules={[{ validator: validateUrl }]}>
            <Input prefix={<LinkOutlined />} placeholder="服务端地址" />
          </Form.Item>

          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <LoginButton type="primary" htmlType="submit" block loading={loading}>
              登录
            </LoginButton>
          </Form.Item>
        </Form>
      </LoginCard>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 100vh;
  background-color: transparent;
  -webkit-app-region: drag;
`

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 25px;
  padding: 15px 24px;
  -webkit-app-region: no-drag;
`

const LogoContainer = styled.div`
  text-align: center;
  margin-bottom: 24px;

  img {
    height: 64px;
    width: auto;
    border-radius: 50%;
    margin-bottom: 12px;
  }
`

const BrandTitle = styled.h1`
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
  padding: 0;
`

const LoginButton = styled(Button)`
  height: 40px;
`

export default LoginPage
