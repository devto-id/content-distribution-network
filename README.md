# CONTENT DISTRIBUTION NETWORK (CDN)

## Upload

[POST] /store

```json
{
  "files": []
}
```

## Retrieve

[GET] /:filename

### Retrieve Thumbnail of Video

[GET] /:filename?type=[thumb|thumbnail]

### Retrieve Specific Image Size

[GET] /:filename?size=[tiny|small|medium]

###### (All queries can be combined)
