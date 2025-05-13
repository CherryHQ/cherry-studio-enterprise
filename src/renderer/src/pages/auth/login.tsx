import { LockOutlined, UserOutlined } from '@ant-design/icons'
import api, { updateApiToken } from '@renderer/config/api'
import { AppLogo } from '@renderer/config/env'
import { useDefaultModel } from '@renderer/hooks/useAssistant'
import { useProvider } from '@renderer/hooks/useProvider'
import { useAppDispatch } from '@renderer/store'
import { setAccessToken, setUser } from '@renderer/store/auth'
import { Model } from '@renderer/types'
import { getDefaultGroupName } from '@renderer/utils'
import { Button, Card, Form, Input } from 'antd'
import { FC, useState } from 'react'
import styled from 'styled-components'

interface LoginFormValues {
  username: string
  password: string
}

const LoginPage: FC = () => {
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()
  const { provider, updateProvider, addModel } = useProvider('cherry-enterprise')
  const { setDefaultModel, setTopicNamingModel, setTranslateModel } = useDefaultModel()

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true)

    try {
      const { data } = await api.authLogin({
        authLoginRequest: {
          username: values.username,
          password: values.password
        }
      })

      const { user, access_token } = data

      updateApiToken(access_token)

      const { data: configurations } = await api.configurationGetConfigurations()
      const { models, apiKey, apiHost, defaultAssistantModel, defaultTopicNamingModel, defaultTranslationModel } =
        configurations

      if (!apiKey) {
        return Promise.reject('请联系管理员配置 API 密钥')
      }

      if (!apiHost) {
        return Promise.reject('请联系管理员配置 API 地址')
      }

      updateProvider({ ...provider, apiKey, apiHost })

      if (models) {
        models.forEach((model: any, index: number) => {
          const _model = {
            id: model.id,
            provider: provider.id,
            name: model.name,
            group: getDefaultGroupName(model.id || model.name),
            owned_by: model.owned_by
          }

          addModel(_model)

          if (index === 0) {
            setDefaultModel({ ...defaultAssistantModel, provider: provider.id } as Model)
            setTopicNamingModel({ ...defaultTopicNamingModel, provider: provider.id } as Model)
            setTranslateModel({ ...defaultTranslationModel, provider: provider.id } as Model)
          }
        })
      }

      if (user) {
        dispatch(setUser(user))
      }

      if (access_token) {
        dispatch(setAccessToken(access_token))
      }
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
        </LogoContainer>
        <Form name="login" initialValues={{ remember: true }} onFinish={onFinish} size="large">
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
  border-radius: 8px;
  padding: 24px;
  -webkit-app-region: no-drag;
`

const LogoContainer = styled.div`
  text-align: center;
  margin-bottom: 24px;

  img {
    height: 64px;
    width: auto;
    border-radius: 50%;
  }
`

const LoginButton = styled(Button)`
  height: 40px;
`

export default LoginPage
