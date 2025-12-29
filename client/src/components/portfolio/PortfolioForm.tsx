import React, { useEffect } from 'react'
import { Portfolio, CreatePortfolioData, UpdatePortfolioData } from '../../types/portfolio.types'
import Input from '../common/Input'
import Button from '../common/Button'
import Modal from '../common/Modal'

interface PortfolioFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreatePortfolioData | UpdatePortfolioData) => void
  portfolio?: Portfolio | null
  isLoading?: boolean
}

const PortfolioForm: React.FC<PortfolioFormProps> = ({ isOpen, onClose, onSubmit, portfolio, isLoading }) => {
  const [formData, setFormData] = React.useState<CreatePortfolioData>({
    name: '',
    subtitle: '',
    site_range: '',
  })

  useEffect(() => {
    if (portfolio) {
      setFormData({
        name: portfolio.name,
        subtitle: portfolio.subtitle || '',
        site_range: portfolio.site_range || '',
      })
    } else {
      setFormData({ name: '', subtitle: '', site_range: '' })
    }
  }, [portfolio, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    onSubmit(formData)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={portfolio ? 'Edit Portfolio' : 'Create Portfolio'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Portfolio Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., Solar Farm North"
        />

        <Input
          label="Subtitle (Optional)"
          value={formData.subtitle}
          onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
          placeholder="e.g., Locus System"
        />

        <Input
          label="Site Range (Optional)"
          value={formData.site_range}
          onChange={(e) => setFormData({ ...formData, site_range: e.target.value })}
          placeholder="e.g., Sites 1-50"
        />

        <div className="flex gap-3 pt-4">
          <Button type="submit" isLoading={isLoading} className="flex-1">
            {portfolio ? 'Update' : 'Create'} Portfolio
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default PortfolioForm

