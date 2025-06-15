import { DashboardLayout } from "@/components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Clock, CheckCircle, XCircle, Eye, Link as LinkIcon, Star, StarOff } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"

interface Episode {
  title: string
  videoUrl: string
  thumbnailUrl: string
}

interface SeriesUpload {
  id: string
  title: string
  genre: string
  description: string
  episodes: Episode[]
  status: 'coming_soon' | 'draft' | 'uploading' | 'completed' | 'failed'
  uploadDate: string
  totalEpisodes: number
  uploadedEpisodes: number
  posterUrl: string
  isFeatured: boolean
}

export default function UploadSeries() {
  const [episodes, setEpisodes] = useState<Episode[]>([{ title: "", videoUrl: "", thumbnailUrl: "" }])
  const [seriesTitle, setSeriesTitle] = useState("")
  const [seriesGenre, setSeriesGenre] = useState("")
  const [seriesDescription, setSeriesDescription] = useState("")
  const [uploadHistory, setUploadHistory] = useState<SeriesUpload[]>([])
  const [activeTab, setActiveTab] = useState("upload")
  const [isUploading, setIsUploading] = useState(false)
  const [posterUrl, setPosterUrl] = useState("")
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null)
  const [isFeatured, setIsFeatured] = useState(false)

  // Fetch existing series on first render
  useEffect(() => {
    const fetchUploadHistory = async () => {
      const { data, error } = await supabase
        .from('series_meta')
        .select('id, title, genre, description, status, episodes, created_at, image_url, is_featured')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch upload history', error)
        return
      }

      const history: SeriesUpload[] = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        genre: row.genre ?? '',
        description: row.description ?? '',
        episodes: [], // will be fetched lazily when editing
        status: row.status === 'active' ? 'completed' : (row.status ?? 'completed'),
        uploadDate: row.created_at ? row.created_at.split('T')[0] : '',
        totalEpisodes: row.episodes ?? 0,
        uploadedEpisodes: row.episodes ?? 0,
        posterUrl: row.image_url ?? '',
        isFeatured: row.is_featured ?? false
      }))

      setUploadHistory(history)
    }

    fetchUploadHistory()
  }, [])

  const addEpisode = () => {
    setEpisodes([...episodes, { title: "", videoUrl: "", thumbnailUrl: "" }])
  }

  const removeEpisode = (index: number) => {
    setEpisodes(episodes.filter((_, i) => i !== index))
  }

  const startEditSeries = async (series: SeriesUpload) => {
    setSeriesTitle(series.title)
    setSeriesGenre(series.genre)
    setSeriesDescription(series.description)
    setPosterUrl(series.posterUrl || "")
    setIsFeatured(series.isFeatured || false)
    let epList = series.episodes
    if (!epList.length) {
      const { data: eps, error } = await supabase
        .from('episodes')
        .select('title, video_url, thumbnail_url')
        .eq('series_id', series.id)
        .order('episode_number')

      if (!error && eps) {
        epList = eps.map((e: any) => ({
          title: e.title,
          videoUrl: e.video_url,
          thumbnailUrl: e.thumbnail_url
        }))
      }
    }

    setEpisodes(epList.length ? epList : [{ title: "", videoUrl: "", thumbnailUrl: "" }])
    setEditingSeriesId(series.id)
    setActiveTab("upload")
  }

  const cancelEditing = () => {
    setEditingSeriesId(null)
    setSeriesTitle("")
    setSeriesGenre("")
    setSeriesDescription("")
    setPosterUrl("")
    setEpisodes([{ title: "", videoUrl: "", thumbnailUrl: "" }])
    setIsFeatured(false)
  }

  // Helper to set one series as featured and clear others
  const applyFeaturedSelection = async (targetId: string | null) => {
    try {
      // 1. Remove featured flag from all series except maybe target
      await supabase.from('series_meta').update({ is_featured: false }).eq('is_featured', true)

      // 2. If targetId provided, set it featured
      if (targetId) {
        await supabase.from('series_meta').update({ is_featured: true }).eq('id', targetId)
      }

      // 3. Update local history state
      setUploadHistory(prev => prev.map(s => ({ ...s, isFeatured: s.id === targetId })))
    } catch (err) {
      console.error('Failed to update featured selection', err)
      alert('Failed to apply featured selection')
    }
  }

  const handleSeriesUpdate = async () => {
    if (!editingSeriesId) return
    if (!seriesTitle) return alert("Please enter series title")
    if (!posterUrl) return alert("Please enter a poster URL")

    setIsUploading(true)
    try {
      // Update series_meta row
      const { error: updErr } = await supabase
        .from('series_meta')
        .update({
          title: seriesTitle,
          description: seriesDescription,
          genre: seriesGenre,
          image_url: posterUrl.trim(),
          is_featured: isFeatured,
          episodes: episodes.length
        })
        .eq('id', editingSeriesId)

      if (updErr) throw updErr

      // Replace episodes list
      await supabase.from('episodes').delete().eq('series_id', editingSeriesId)
      await Promise.all(
        episodes.map(async (ep, idx) => {
          await supabase.from('episodes').insert({
            series_id: editingSeriesId,
            title: ep.title || `Episode ${idx + 1}`,
            episode_number: idx + 1,
            video_url: ep.videoUrl.trim(),
            thumbnail_url: ep.thumbnailUrl.trim()
          })
        })
      )

      // Update UI history
      setUploadHistory(prev => prev.map(s => s.id === editingSeriesId ? {
        ...s,
        title: seriesTitle,
        genre: seriesGenre,
        description: seriesDescription,
        episodes,
        totalEpisodes: episodes.length,
        uploadedEpisodes: episodes.length,
        posterUrl,
        isFeatured
      } : s))

      // If user marked as featured ensure exclusivity
      if (isFeatured) {
        await applyFeaturedSelection(editingSeriesId)
      }

      cancelEditing()
      setActiveTab('history')
    } catch (err) {
      console.error('Update failed', err)
      alert('Update failed, see console')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSeriesUpload = async () => {
    if (!seriesTitle) return alert("Please enter series title")
    if (!posterUrl) return alert("Please enter a poster URL")
    setIsUploading(true)

    try {
      // 1. Create series record directly (status: active)
      const { data: seriesRow, error: seriesErr } = await supabase
        .from('series_meta')
        .insert({
          title: seriesTitle,
          description: seriesDescription,
          genre: seriesGenre,
          category: 'latest',
          is_featured: isFeatured,
          episodes: episodes.length,
          status: 'active',
          image_url: posterUrl.trim()
        })
        .select()
        .single()

      if (seriesErr || !seriesRow) throw seriesErr

      // 2. Insert episode rows with provided URLs
      await Promise.all(
        episodes.map(async (ep, idx) => {
          await supabase.from('episodes').insert({
            series_id: seriesRow.id,
            title: ep.title || `Episode ${idx + 1}`,
            episode_number: idx + 1,
            video_url: ep.videoUrl.trim(),
            thumbnail_url: ep.thumbnailUrl.trim()
          })
        })
      )

      // 5. Update UI history
      const newSeries: SeriesUpload = {
        id: seriesRow.id,
        title: seriesRow.title,
        genre: seriesRow.genre ?? '',
        description: seriesRow.description,
        episodes,
        status: 'completed',
        uploadDate: new Date().toISOString().split('T')[0],
        totalEpisodes: episodes.length,
        uploadedEpisodes: episodes.length,
        posterUrl,
        isFeatured
      }

      setUploadHistory([newSeries, ...uploadHistory])

      // If newly uploaded marked as featured ensure exclusivity
      if (isFeatured) {
        await applyFeaturedSelection(seriesRow.id)
      }

      // Reset form
      setSeriesTitle("")
      setSeriesGenre("")
      setSeriesDescription("")
      setEpisodes([{ title: "", videoUrl: "", thumbnailUrl: "" }])
      setPosterUrl("")
      setIsFeatured(false)
      setActiveTab('history')
    } catch (err) {
      console.error('Series upload failed', err)
      alert('Upload failed, see console')
    } finally {
      setIsUploading(false)
    }
  }

  const handleComingSoon = async () => {
    if (!seriesTitle) return alert("Please enter series title")
    if (!posterUrl) return alert("Please enter a poster URL")

    setIsUploading(true)
    try {
      const { data: seriesRow, error } = await supabase
        .from('series_meta')
        .insert({
          title: seriesTitle,
          description: seriesDescription,
          genre: seriesGenre,
          category: 'latest',
          is_featured: isFeatured,
          episodes: 0,
          status: 'coming_soon',
          image_url: posterUrl.trim()
        })
        .select()
        .single()

      if (error || !seriesRow) throw error

      const newSeries: SeriesUpload = {
        id: seriesRow.id,
        title: seriesRow.title,
        genre: seriesRow.genre ?? '',
        description: seriesRow.description,
        episodes: [],
        status: 'coming_soon',
        uploadDate: new Date().toISOString().split('T')[0],
        totalEpisodes: 0,
        uploadedEpisodes: 0,
        posterUrl,
        isFeatured
      }

      setUploadHistory([newSeries, ...uploadHistory])

      setSeriesTitle("")
      setSeriesGenre("")
      setSeriesDescription("")
      setPosterUrl("")
      setEpisodes([{ title: "", videoUrl: "", thumbnailUrl: "" }])
      setIsFeatured(false)
      setActiveTab('history')
    } catch (err) {
      console.error('Coming soon save failed', err)
      alert('Save failed, see console')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteSeries = async (seriesId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this series? This action cannot be undone.")
    if (!confirmDelete) return

    setIsUploading(true)
    try {
      // Remove all episodes first to avoid foreign-key issues
      await supabase.from('episodes').delete().eq('series_id', seriesId)
      // Delete the series meta row
      await supabase.from('series_meta').delete().eq('id', seriesId)

      // Update local state – drop from history list
      setUploadHistory(prev => prev.filter(s => s.id !== seriesId))

      // Reset editing form if the deleted series was being edited
      if (editingSeriesId === seriesId) {
        cancelEditing()
      }
    } catch (err) {
      console.error('Failed to delete series', err)
      alert('Failed to delete series, see console for details')
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'uploading':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'coming_soon':
        return <Clock className="h-4 w-4 text-blue-400" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>
      case 'uploading':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Uploading</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'coming_soon':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Coming Soon</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Upload Web Series</h1>
          <p className="text-muted-foreground mt-2">Upload new web series and manage your upload history</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card">
            <TabsTrigger value="upload">{editingSeriesId ? 'Edit Series' : 'New Upload'}</TabsTrigger>
            <TabsTrigger value="history">Upload History</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Tabs defaultValue="series" className="space-y-6">
              <TabsList className="bg-card">
                <TabsTrigger value="series">Series Information</TabsTrigger>
                <TabsTrigger value="episodes">Episodes</TabsTrigger>
              </TabsList>

              <TabsContent value="series">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-white">{editingSeriesId ? 'Edit Series Details' : 'Series Details'}</CardTitle>
                    <CardDescription>Add basic information about your web series</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="title">Series Title</Label>
                        <Input 
                          id="title" 
                          placeholder="Enter series title" 
                          value={seriesTitle}
                          onChange={(e) => setSeriesTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="genre">Genre</Label>
                        <Input 
                          id="genre" 
                          placeholder="e.g., Drama, Comedy, Thriller" 
                          value={seriesGenre}
                          onChange={(e) => setSeriesGenre(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Enter series description..."
                        className="min-h-[120px]"
                        value={seriesDescription}
                        onChange={(e) => setSeriesDescription(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="posterUrl">Poster Image URL</Label>
                      <Input
                        id="posterUrl"
                        placeholder="https://cdn.example.com/posters/series.jpg"
                        value={posterUrl}
                        onChange={(e) => setPosterUrl(e.target.value)}
                      />
                      {posterUrl && (
                        <img src={posterUrl} alt="poster preview" className="h-40 mx-auto object-cover rounded" />
                      )}
                      <div className="flex items-center space-x-2 mt-4">
                        <Checkbox id="featured-toggle" checked={isFeatured} onCheckedChange={(checked) => setIsFeatured(!!checked)} />
                        <Label htmlFor="featured-toggle">Show in Featured Carousel</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="episodes">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-white">Episodes</h3>
                    <Button onClick={addEpisode} className="bg-accent hover:bg-accent/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Episode
                    </Button>
                  </div>

                  {episodes.map((episode, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-white">Episode {index + 1}</CardTitle>
                          {episodes.length > 1 && (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => removeEpisode(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`episode-title-${index}`}>Episode Title</Label>
                          <Input 
                            id={`episode-title-${index}`} 
                            placeholder="Enter episode title" 
                            value={episode.title}
                            onChange={(e) => {
                              const newEpisodes = [...episodes]
                              newEpisodes[index].title = e.target.value
                              setEpisodes(newEpisodes)
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Video URL (Bunny Stream)</Label>
                            <Input
                              placeholder="https://vz-....b-cdn.net/.../playlist.m3u8"
                              value={episode.videoUrl}
                              onChange={(e) => {
                                const newEpisodes = [...episodes]
                                newEpisodes[index].videoUrl = e.target.value
                                setEpisodes(newEpisodes)
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Thumbnail URL</Label>
                            <Input
                              placeholder="https://cdn.example.com/thumbs/ep1.jpg"
                              value={episode.thumbnailUrl}
                              onChange={(e) => {
                                const newEpisodes = [...episodes]
                                newEpisodes[index].thumbnailUrl = e.target.value
                                setEpisodes(newEpisodes)
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-4">
              {editingSeriesId ? (
                <>
                  <Button variant="outline" onClick={cancelEditing} disabled={isUploading}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-accent hover:bg-accent/90"
                    onClick={handleSeriesUpdate}
                    disabled={!seriesTitle || !posterUrl || episodes.some(ep => !ep.videoUrl) || isUploading}
                  >
                    Update Series
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleComingSoon} disabled={!seriesTitle || !posterUrl || isUploading}>
                    Save as Coming Soon
                  </Button>
                  <Button 
                    className="bg-accent hover:bg-accent/90"
                    onClick={handleSeriesUpload}
                    disabled={!seriesTitle || !posterUrl || episodes.some(ep => !ep.videoUrl) || isUploading}
                  >
                    Upload Series
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Upload History</CardTitle>
                    <CardDescription>Track all your series uploads and their status</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setActiveTab("upload")}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Upload
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Series</TableHead>
                      <TableHead>Genre</TableHead>
                      <TableHead>Episodes</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadHistory.map((series) => (
                      <TableRow key={series.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-white">{series.title}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">{series.description}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-white">{series.genre}</TableCell>
                        <TableCell className="text-white">{series.totalEpisodes}</TableCell>
                        <TableCell className="text-white">{series.uploadDate}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(series.status)}
                            {getStatusBadge(series.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="text-sm text-white">
                              {series.uploadedEpisodes}/{series.totalEpisodes} episodes
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-accent h-2 rounded-full transition-all"
                                style={{ 
                                  width: `${series.totalEpisodes ? (series.uploadedEpisodes / series.totalEpisodes) * 100 : 0}%` 
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => startEditSeries(series)} title="Edit">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {/* Feature/unfeature toggle */}
                            <Button
                              variant={series.isFeatured ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => applyFeaturedSelection(series.isFeatured ? null : series.id)}
                              title={series.isFeatured ? "Remove from Featured" : "Set as Featured"}
                            >
                              {series.isFeatured ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                            </Button>
                            {/* Delete series button */}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSeries(series.id)}
                              title="Delete Series"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {series.status === 'failed' && (
                              <Button variant="outline" size="sm">
                                Retry
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
